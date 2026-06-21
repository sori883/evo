import * as path from "node:path";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import * as agentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import type { SkillStore } from "./skill-store";

export interface IncidentConstructProps {
  /** 共有 skill ストア。incident は自分の namespace のみ読む。 */
  skillStore: SkillStore;
  /** 自分の skill namespace（= "incident"）。 */
  agentId: string;
  /** Bedrock モデルID（既定は他エージェントと同じ Haiku、env で切替可）。 */
  modelId: string;
  /** CodeZip の managed runtime 識別子（NODE_22）。 */
  managedRuntime: string;
  /** agents/incident の pnpm deploy 出力ディレクトリ。 */
  codePath: string;
  /** Runtime 名（例: evo_incident）。 */
  runtimeName: string;
  targetTagKey: string;
  targetTagValue: string;
  /** GitHub fine-grained PAT（PR 作成用。未設定可＝diagnosis のみ）。 */
  githubToken: string;
  /** 対象リポジトリ（例: sori883/evo）。 */
  githubRepo: string;
}

/**
 * インシデント対処エージェント。report と同じ AgentCore Runtime(CodeZip, SigV4)。
 * CloudWatch アラーム(→ALARM)を EventBridge Rule で受け、中継 Lambda 経由で
 * InvokeAgentRuntime する（Rule は AgentCore を直接ターゲットにできないため）。
 * **AWS リソースへの書込権限は付与しない**（診断は read-only、対処は PR）。
 */
export class IncidentConstruct extends Construct {
  readonly runtime: agentcore.CfnRuntime;
  readonly bucket: s3.Bucket;
  readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: IncidentConstructProps) {
    super(scope, id);

    const { region, account } = Stack.of(this);

    // インシデント診断レポート保存用 S3（非公開・暗号化・バージョニング）
    this.bucket = new s3.Bucket(this, "Incidents", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

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

    // Bedrock モデル呼び出し（推論プロファイル/FM へ限定）
    const modelSegments = props.modelId.split(".");
    const baseModelId =
      modelSegments.length >= 3 ? modelSegments.slice(1).join(".") : props.modelId;
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          `arn:aws:bedrock:${region}:${account}:inference-profile/${props.modelId}`,
          `arn:aws:bedrock:*::foundation-model/${baseModelId}`,
        ],
      }),
    );

    // read-only な収集権限（report と同等）。書込系は一切付与しない。
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "tag:GetResources",
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:DescribeAlarms",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:GetQueryResults",
          "logs:FilterLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "inspector2:ListFindings",
          "securityhub:GetFindings",
        ],
        resources: ["*"],
      }),
    );

    // インシデントレポート保存（incidents/ 配下のみ）
    this.bucket.grantPut(this.executionRole, "incidents/*");

    // 共有 skill: incident は非ハブ（自分の namespace のみ読み取り）。
    props.skillStore.grantRead(this.executionRole, props.agentId, false);
    props.skillStore.grantWriteDynamic(this.executionRole, props.agentId);

    // 自身のコンテナログ
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`,
        ],
      }),
    );
    // 可観測性
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
        ],
        resources: ["*"],
      }),
    );
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: { "cloudwatch:namespace": "bedrock-agentcore" },
        },
      }),
    );
    asset.grantRead(this.executionRole);

    // SigV4(JWT 無し)の AgentCore Runtime
    this.runtime = new agentcore.CfnRuntime(this, "Runtime", {
      agentRuntimeName: props.runtimeName,
      roleArn: this.executionRole.roleArn,
      networkConfiguration: { networkMode: "PUBLIC" },
      protocolConfiguration: "HTTP",
      agentRuntimeArtifact: {
        codeConfiguration: {
          code: { s3: { bucket: asset.s3BucketName, prefix: asset.s3ObjectKey } },
          entryPoint: ["dist/index.js"],
          runtime: props.managedRuntime,
        },
      },
      environmentVariables: {
        AWS_REGION: region,
        INCIDENT_MODEL_ID: props.modelId,
        INCIDENTS_BUCKET: this.bucket.bucketName,
        SKILLS_BUCKET: props.skillStore.bucket.bucketName,
        AGENT_ID: props.agentId,
        TARGET_TAG_KEY: props.targetTagKey,
        TARGET_TAG_VALUE: props.targetTagValue,
        // PR 作成用（EVO-36 で使用。未設定可）。
        GITHUB_TOKEN: props.githubToken,
        GITHUB_REPO: props.githubRepo,
      },
    });

    // CloudWatch アラーム(→ALARM) → EventBridge Rule → 中継 Lambda → InvokeAgentRuntime
    const invoker = new NodejsFunction(this, "AlarmInvoker", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "..", "lambda", "alarm-invoker.ts"),
      handler: "handler",
      // bedrock-agentcore クライアントはランタイム未同梱のため必ずバンドルする。
      bundling: { externalModules: [], target: "node22" },
      environment: {
        AGENT_RUNTIME_ARN: this.runtime.attrAgentRuntimeArn,
      },
    });
    invoker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock-agentcore:InvokeAgentRuntime"],
        resources: [
          this.runtime.attrAgentRuntimeArn,
          `${this.runtime.attrAgentRuntimeArn}/*`,
        ],
      }),
    );

    const rule = new events.Rule(this, "AlarmRule", {
      description: "CloudWatch アラーム(→ALARM)で incident エージェントを起動",
      eventPattern: {
        source: ["aws.cloudwatch"],
        detailType: ["CloudWatch Alarm State Change"],
        detail: { state: { value: ["ALARM"] } },
      },
    });
    rule.addTarget(new targets.LambdaFunction(invoker, { retryAttempts: 2 }));
  }
}
