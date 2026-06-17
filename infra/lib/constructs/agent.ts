import * as path from "node:path";
import { Stack } from "aws-cdk-lib";
import * as agentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";

export interface AgentConstructProps {
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  memory: agentcore.CfnMemory;
  table: dynamodb.ITable;
  /** Bedrock モデルID（jp.* 推論プロファイル）。env 由来でハードコードしない。 */
  modelId: string;
  agentRuntimeName: string;
  /** CodeZip の managed runtime 識別子。 */
  managedRuntime: string;
  /** agents/chat のビルド成果物(dist)ディレクトリ。 */
  codePath: string;
}

/**
 * AgentCore Runtime（CodeZip）+ JWT Authorizer(Cognito) + 実行 IAM ロール。
 * agents/chat の dist を S3 Asset 化して CodeZip として参照する。
 */
export class AgentConstruct extends Construct {
  readonly runtime: agentcore.CfnRuntime;
  readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: AgentConstructProps) {
    super(scope, id);

    const { region, account } = Stack.of(this);

    // codePath は `pnpm deploy --config.node-linker=hoisted` 生成の自己完結
    // パッケージ（dist + フラットな実体 node_modules）。symlink を含まない
    // 前提なので followSymlinks は既定のまま（ALWAYS は pnpm の循環 symlink で
    // 無限ループになるため使わない。node_modules/.bin は deploy 後に除去する）。
    const asset = new Asset(this, "Code", { path: props.codePath });

    this.executionRole = new iam.Role(this, "RuntimeRole", {
      assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com", {
        conditions: {
          StringEquals: { "aws:SourceAccount": account },
          ArnLike: {
            "aws:SourceArn": `arn:aws:bedrock-agentcore:${region}:${account}:*`,
          },
        },
      }),
    });

    // Bedrock モデル呼び出し（推論プロファイル + foundation-model）
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      }),
    );
    // AgentCore Memory データプレーン
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock-agentcore:CreateEvent",
          "bedrock-agentcore:ListEvents",
          "bedrock-agentcore:RetrieveMemoryRecords",
          "bedrock-agentcore:ListMemoryRecords",
        ],
        resources: [props.memory.attrMemoryArn],
      }),
    );
    // CloudWatch Logs（ロググループはプラットフォームが初回 invoke 時に自動作成。
    // この権限が無いと作成されずコンテナログが一切出ない＝観測性ゼロになる）
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ],
        resources: [
          `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`,
        ],
      }),
    );
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:DescribeLogGroups"],
        resources: [`arn:aws:logs:${region}:${account}:log-group:*`],
      }),
    );
    // 将来の共有データ参照
    props.table.grantReadData(this.executionRole);
    // CodeZip(S3 asset) の読み取り
    asset.grantRead(this.executionRole);

    const discoveryUrl = `https://cognito-idp.${region}.amazonaws.com/${props.userPool.userPoolId}/.well-known/openid-configuration`;

    this.runtime = new agentcore.CfnRuntime(this, "Runtime", {
      agentRuntimeName: props.agentRuntimeName,
      roleArn: this.executionRole.roleArn,
      networkConfiguration: { networkMode: "PUBLIC" },
      protocolConfiguration: "HTTP",
      agentRuntimeArtifact: {
        codeConfiguration: {
          code: { s3: { bucket: asset.s3BucketName, prefix: asset.s3ObjectKey } },
          // pnpm deploy 出力では dist/index.js が entry（zip 内パスと一致させる）
          entryPoint: ["dist/index.js"],
          runtime: props.managedRuntime,
        },
      },
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl,
          allowedClients: [props.userPoolClient.userPoolClientId],
        },
      },
      // customJwtAuthorizer は検証のみ。Authorization をコンテナへ転送するには
      // allowlist への明示追加が必要（agent が JWT から sub=actorId を取り出す）。
      requestHeaderConfiguration: {
        requestHeaderAllowlist: ["Authorization"],
      },
      environmentVariables: {
        // agents/chat の env 検証(env.ts)が AWS_REGION を必須にしている。
        // managed runtime は AWS_REGION を自動注入しないため明示的に渡す
        // （未注入だと起動時に parseEnv が throw しコンテナ初期化が失敗する）。
        AWS_REGION: region,
        BEDROCK_MODEL_ID: props.modelId,
        MEMORY_ID: props.memory.attrMemoryId,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
      },
    });
  }
}
