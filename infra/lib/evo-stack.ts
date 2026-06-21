import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AgentConstruct } from "./constructs/agent";
import { AuthConstruct } from "./constructs/auth";
import { DataConstruct } from "./constructs/data";
import { IncidentConstruct } from "./constructs/incident";
import { MemoryConstruct } from "./constructs/memory";
import { ReportConstruct } from "./constructs/report";
import { SkillStore } from "./constructs/skill-store";

export interface EvoStackProps extends cdk.StackProps {
  /** Bedrock モデルID（jp.* 推論プロファイル）。env 由来。 */
  modelId: string;
  agentRuntimeName: string;
  managedRuntime: string;
  /** agents/chat のビルド成果物(dist)ディレクトリ。 */
  agentCodePath: string;
  /** agents/report の pnpm deploy 出力ディレクトリ。 */
  reportCodePath: string;
  /** レポート Runtime 名（例: evo_report）。 */
  reportRuntimeName: string;
  /** レポートのスケジュール式（例: rate(1 day)）。 */
  reportScheduleExpression: string;
  /** base skill のシード元（リポジトリ `skills/` ディレクトリ）。 */
  skillsSeedPath: string;
  /** agents/incident の pnpm deploy 出力ディレクトリ。 */
  incidentCodePath: string;
  /** incident Runtime 名（例: evo_incident）。 */
  incidentRuntimeName: string;
  /** incident のモデルID（既定は modelId にフォールバック）。 */
  incidentModelId: string;
  /** GitHub PAT（PR 作成用。未設定可）。 */
  githubToken: string;
  /** 対象リポジトリ（例: sori883/evo）。 */
  githubRepo: string;
}

/**
 * 単一スタック。Auth / Memory / Data / Agent の各 Construct をまとめる。
 */
export class EvoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EvoStackProps) {
    super(scope, id, props);

    // ドッグフード: スタック内の全リソースに監視対象タグを付け、レポート対象にする。
    cdk.Tags.of(this).add("evo-target", "true");

    const auth = new AuthConstruct(this, "Auth");
    const memory = new MemoryConstruct(this, "Memory");
    const data = new DataConstruct(this, "Data");
    // 共有 skill ストア（base を seed、各 Runtime に namespace 別アクセスを付与）。
    const skills = new SkillStore(this, "Skills", {
      seedPath: props.skillsSeedPath,
    });

    // chat が reports バケットを参照するため Report を先に作る。
    const report = new ReportConstruct(this, "Report", {
      table: data.table,
      skillStore: skills,
      agentId: "report",
      modelId: props.modelId,
      managedRuntime: props.managedRuntime,
      codePath: props.reportCodePath,
      runtimeName: props.reportRuntimeName,
      targetTagKey: "evo-target",
      targetTagValue: "true",
      scheduleExpression: props.reportScheduleExpression,
    });

    const agent = new AgentConstruct(this, "Agent", {
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      memory: memory.memory,
      table: data.table,
      reportsBucket: report.bucket,
      skillStore: skills,
      agentId: "chat",
      modelId: props.modelId,
      agentRuntimeName: props.agentRuntimeName,
      managedRuntime: props.managedRuntime,
      codePath: props.agentCodePath,
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "MemoryId", { value: memory.memory.attrMemoryId });
    new cdk.CfnOutput(this, "AgentRuntimeArn", {
      value: agent.runtime.attrAgentRuntimeArn,
    });

    new cdk.CfnOutput(this, "SharedTableName", { value: data.table.tableName });
    new cdk.CfnOutput(this, "ReportRuntimeArn", {
      value: report.runtime.attrAgentRuntimeArn,
    });
    new cdk.CfnOutput(this, "ReportsBucketName", {
      value: report.bucket.bucketName,
    });
    new cdk.CfnOutput(this, "SkillsBucketName", {
      value: skills.bucket.bucketName,
    });

    // インシデント対処エージェント（アラーム駆動・read-only 診断・対処は PR）。
    const incident = new IncidentConstruct(this, "Incident", {
      skillStore: skills,
      agentId: "incident",
      modelId: props.incidentModelId,
      managedRuntime: props.managedRuntime,
      codePath: props.incidentCodePath,
      runtimeName: props.incidentRuntimeName,
      targetTagKey: "evo-target",
      targetTagValue: "true",
      githubToken: props.githubToken,
      githubRepo: props.githubRepo,
    });
    new cdk.CfnOutput(this, "IncidentRuntimeArn", {
      value: incident.runtime.attrAgentRuntimeArn,
    });
    new cdk.CfnOutput(this, "IncidentsBucketName", {
      value: incident.bucket.bucketName,
    });
  }
}
