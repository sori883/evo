import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as agentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import { Construct } from "constructs";
import type { SkillStore } from "./skill-store";

export interface ReportConstructProps {
  /** overlay(会話由来の改善指示)を読む共有テーブル。 */
  table: dynamodb.ITable;
  /** 共有 skill ストア。report は自分の namespace のみ読む。 */
  skillStore: SkillStore;
  /** 自分の skill namespace（= "report"）。 */
  agentId: string;
  /** Bedrock モデルID（chat と同一）。 */
  modelId: string;
  /** CodeZip の managed runtime 識別子（NODE_22）。 */
  managedRuntime: string;
  /** agents/report の pnpm deploy 出力ディレクトリ。 */
  codePath: string;
  /** Runtime 名（例: evo_report）。 */
  runtimeName: string;
  targetTagKey: string;
  targetTagValue: string;
  /** EventBridge Scheduler の実行間隔（例: rate(1 day)）。 */
  scheduleExpression: string;
}

/**
 * 運用レポートエージェント。chat と同じ AgentCore Runtime(CodeZip) だが、
 * 内部の定時実行のため **JWT authorizer を付けず SigV4(IAM) 認証**にする。
 * EventBridge Scheduler の universal target から InvokeAgentRuntime で起動する。
 */
export class ReportConstruct extends Construct {
  readonly runtime: agentcore.CfnRuntime;
  readonly bucket: s3.Bucket;
  readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: ReportConstructProps) {
    super(scope, id);

    const { region, account } = Stack.of(this);

    // レポート保存用 S3（非公開・暗号化・バージョニング）
    this.bucket = new s3.Bucket(this, "Reports", {
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

    // Bedrock モデル呼び出し（chat と同様に推論プロファイル/FM へ限定）
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

    // read-only な収集権限（list/describe 系はリソースレベル制御に非対応のため *）
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

    // レポート保存（reports/ 配下のみ）と overlay 読み取り
    this.bucket.grantPut(this.executionRole, "reports/*");
    props.table.grantReadData(this.executionRole);

    // 共有 skill: report は非ハブ（自分の namespace のみ読み取り）。
    // 書込は自分の dynamic のみ（chat の skill は読めない）。
    props.skillStore.grantRead(this.executionRole, props.agentId, false);
    props.skillStore.grantWriteDynamic(this.executionRole, props.agentId);

    // 自身のコンテナログ（chat と同様、未付与だとロググループが作られない）
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
      // authorizerConfiguration を付けない = IAM(SigV4) 認証。
      environmentVariables: {
        AWS_REGION: region,
        BEDROCK_MODEL_ID: props.modelId,
        REPORTS_BUCKET: this.bucket.bucketName,
        SHARED_TABLE_NAME: props.table.tableName,
        SKILLS_BUCKET: props.skillStore.bucket.bucketName,
        AGENT_ID: props.agentId,
        TARGET_TAG_KEY: props.targetTagKey,
        TARGET_TAG_VALUE: props.targetTagValue,
      },
    });

    // EventBridge Scheduler → universal target で InvokeAgentRuntime
    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock-agentcore:InvokeAgentRuntime"],
        resources: [
          this.runtime.attrAgentRuntimeArn,
          `${this.runtime.attrAgentRuntimeArn}/*`,
        ],
      }),
    );

    new scheduler.CfnSchedule(this, "Schedule", {
      scheduleExpression: props.scheduleExpression,
      flexibleTimeWindow: { mode: "OFF" },
      target: {
        arn: "arn:aws:scheduler:::aws-sdk:bedrockagentcore:invokeAgentRuntime",
        roleArn: schedulerRole.roleArn,
        // universal target の Input は PascalCase（API のリクエストシェイプ）。
        input: JSON.stringify({
          AgentRuntimeArn: this.runtime.attrAgentRuntimeArn,
          RuntimeSessionId: "evo-report-scheduled-session-000000000001",
          Qualifier: "DEFAULT",
          // 定時は運用レポートのみ生成（構成はオンデマンドのみ）。
          Payload: JSON.stringify({ kinds: ["operations"] }),
        }),
        retryPolicy: { maximumRetryAttempts: 1, maximumEventAgeInSeconds: 3600 },
      },
    });
  }
}
