import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it, expect } from "vitest";
import { EvoStack } from "../lib/evo-stack";

function buildTemplate(): Template {
  const app = new cdk.App();
  const stack = new EvoStack(app, "TestStack", {
    env: { account: "123456789012", region: "ap-northeast-1" },
    modelId: "jp.anthropic.claude-test-v1:0",
    agentRuntimeName: "evo_chat_test",
    managedRuntime: "NODE_22",
    // テンプレート検証では S3 Asset の中身は不問。ビルド非依存にするため、
    // 常に存在する test ディレクトリ自身を Asset パスに使う。
    agentCodePath: path.join(__dirname),
    reportCodePath: path.join(__dirname),
    reportRuntimeName: "evo_report_test",
    reportScheduleExpression: "rate(1 day)",
    // skill seed も S3 Asset/BucketDeployment になるため実在ディレクトリを使う。
    skillsSeedPath: path.join(__dirname),
    incidentCodePath: path.join(__dirname),
    incidentRuntimeName: "evo_incident_test",
    incidentModelId: "jp.anthropic.claude-test-v1:0",
    githubToken: "",
    githubRepo: "sori883/evo",
  });
  return Template.fromStack(stack);
}

describe("EvoStack", () => {
  const template = buildTemplate();

  it("Cognito UserPool を 1 つ持つ", () => {
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
  });

  it("UserPoolClient が USER_PASSWORD_AUTH を許可する", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ExplicitAuthFlows: Match.arrayWith(["ALLOW_USER_PASSWORD_AUTH"]),
    });
  });

  it("AgentCore Memory を 1 つ持つ", () => {
    template.resourceCountIs("AWS::BedrockAgentCore::Memory", 1);
  });

  it("AgentCore Runtime が Cognito の JWT authorizer を持つ", () => {
    template.hasResourceProperties("AWS::BedrockAgentCore::Runtime", {
      AuthorizerConfiguration: {
        CustomJWTAuthorizer: Match.objectLike({
          // DiscoveryUrl は UserPoolId を含む Fn::Join トークンになるため存在確認に留める
          AllowedClients: Match.anyValue(),
          DiscoveryUrl: Match.anyValue(),
        }),
      },
    });
  });

  it("DynamoDB テーブルを 2 つ持つ（共有データ + incident dedup）", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 2);
  });

  it("主要なリソースIDを出力する", () => {
    const outputs = template.findOutputs("*");
    expect(Object.keys(outputs)).toEqual(
      expect.arrayContaining([
        "UserPoolId",
        "UserPoolClientId",
        "MemoryId",
        "AgentRuntimeArn",
      ]),
    );
  });

  it("Memory が秒指定の expiry と semantic namespace を持つ（agent と整合）", () => {
    template.hasResourceProperties("AWS::BedrockAgentCore::Memory", {
      EventExpiryDuration: 30, // 30 日（日数指定。秒ではない）
      MemoryStrategies: Match.arrayWith([
        Match.objectLike({
          SemanticMemoryStrategy: Match.objectLike({
            // agents/chat/src/memory.ts の retrieve namespace と一致させる
            NamespaceTemplates: ["/strategies/{actorId}"],
          }),
        }),
      ]),
    });
  });

  it("Runtime が CodeZip(entryPoint/runtime) と PUBLIC network を持つ", () => {
    template.hasResourceProperties("AWS::BedrockAgentCore::Runtime", {
      NetworkConfiguration: { NetworkMode: "PUBLIC" },
      AgentRuntimeArtifact: {
        CodeConfiguration: Match.objectLike({
          EntryPoint: ["dist/index.js"],
          Runtime: "NODE_22",
        }),
      },
    });
  });

  it("Runtime env が AWS_REGION を含む（agent の env 検証と整合）", () => {
    // agents/chat/src/env.ts は AWS_REGION を必須にしている。
    // 未注入だと起動時に parseEnv が throw しコンテナ初期化が失敗する。
    template.hasResourceProperties("AWS::BedrockAgentCore::Runtime", {
      EnvironmentVariables: Match.objectLike({
        AWS_REGION: "ap-northeast-1",
        BEDROCK_MODEL_ID: Match.anyValue(),
        MEMORY_ID: Match.anyValue(),
        COGNITO_USER_POOL_ID: Match.anyValue(),
        COGNITO_CLIENT_ID: Match.anyValue(),
      }),
    });
  });

  it("Runtime ロールが confused deputy 対策の信頼ポリシーを持つ", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: "bedrock-agentcore.amazonaws.com" },
            Condition: Match.objectLike({
              StringEquals: Match.anyValue(),
              ArnLike: Match.anyValue(),
            }),
          }),
        ]),
      }),
    });
  });

  it("Runtime が Authorization ヘッダをコンテナへ転送する allowlist を持つ", () => {
    // customJwtAuthorizer は検証のみ。allowlist に入れないと AgentCore は
    // Authorization をコンテナへ転送せず、agent が sub を取得できない。
    template.hasResourceProperties("AWS::BedrockAgentCore::Runtime", {
      RequestHeaderConfiguration: {
        RequestHeaderAllowlist: Match.arrayWith(["Authorization"]),
      },
    });
  });

  it("Runtime ロールの InvokeModel が推論プロファイル/FM に限定される（* でない）", () => {
    // modelId="jp.anthropic.claude-test-v1:0" → FM base は "anthropic.claude-test-v1:0"
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["bedrock:InvokeModel"]),
            Resource: Match.arrayWith([
              "arn:aws:bedrock:ap-northeast-1:123456789012:inference-profile/jp.anthropic.claude-test-v1:0",
              "arn:aws:bedrock:*::foundation-model/anthropic.claude-test-v1:0",
            ]),
          }),
        ]),
      }),
    });
  });

  it("Runtime ロールが X-Ray/メトリクス権限を持つ（可観測性）", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["xray:PutTraceSegments"]),
          }),
        ]),
      }),
    });
  });

  it("実行ロールが CloudWatch Logs 権限を持つ（観測性）", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ]),
          }),
        ]),
      }),
    });
  });

  it("Runtime を 3 つ持つ（chat / report / incident）", () => {
    template.resourceCountIs("AWS::BedrockAgentCore::Runtime", 3);
  });

  it("incident Runtime は JWT authorizer を持たない（SigV4）かつ env を注入", () => {
    const runtimes = template.findResources("AWS::BedrockAgentCore::Runtime");
    const incident = Object.values(runtimes).find(
      (r) =>
        (r.Properties as { AgentRuntimeName?: string }).AgentRuntimeName ===
        "evo_incident_test",
    );
    expect(incident).toBeDefined();
    const props = incident?.Properties as {
      AuthorizerConfiguration?: unknown;
      EnvironmentVariables?: Record<string, unknown>;
    };
    expect(props.AuthorizerConfiguration).toBeUndefined();
    expect(props.EnvironmentVariables).toMatchObject({
      AGENT_ID: "incident",
      INCIDENT_MODEL_ID: "jp.anthropic.claude-test-v1:0",
      INCIDENTS_BUCKET: expect.anything(),
      GITHUB_REPO: "sori883/evo",
    });
  });

  it("新規 ALARM 遷移のみ発火する EventBridge Rule を持つ（再評価は除外）", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: Match.objectLike({
        source: ["aws.cloudwatch"],
        "detail-type": ["CloudWatch Alarm State Change"],
        detail: {
          state: { value: ["ALARM"] },
          previousState: { value: [{ "anything-but": "ALARM" }] },
        },
      }),
    });
  });

  it("dedup 用 DynamoDB（TTL）を持ち、Lambda env に窓設定を注入", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: "alarmName", KeyType: "HASH" }),
      ]),
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
    });
    template.hasResourceProperties("AWS::Lambda::Function", {
      Timeout: 120,
      Environment: {
        Variables: Match.objectLike({
          DEDUP_TABLE_NAME: Match.anyValue(),
          DEDUP_WINDOW_SECONDS: "900",
        }),
      },
    });
  });

  it("chat が report を起動できる（env + InvokeAgentRuntime 権限）", () => {
    template.hasResourceProperties("AWS::BedrockAgentCore::Runtime", {
      AgentRuntimeName: "evo_chat_test",
      EnvironmentVariables: Match.objectLike({
        REPORT_RUNTIME_ARN: Match.anyValue(),
        INCIDENTS_BUCKET: Match.anyValue(),
      }),
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "bedrock-agentcore:InvokeAgentRuntime",
          }),
        ]),
      }),
    });
  });

  it("アラーム中継 Lambda が InvokeAgentRuntime 権限を持つ", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "bedrock-agentcore:InvokeAgentRuntime",
          }),
        ]),
      }),
    });
  });

  it("incident 実行ロールが収集(read-only)権限を持ち、書込系を持たない", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              "tag:GetResources",
              "cloudwatch:DescribeAlarms",
              "logs:StartQuery",
            ]),
          }),
        ]),
      }),
    });
  });

  it("レポート Runtime は JWT authorizer を持たない（SigV4 認証）", () => {
    const runtimes = template.findResources("AWS::BedrockAgentCore::Runtime");
    const report = Object.values(runtimes).find(
      (r) =>
        (r.Properties as { AgentRuntimeName?: string }).AgentRuntimeName ===
        "evo_report_test",
    );
    expect(report).toBeDefined();
    expect(
      (report?.Properties as { AuthorizerConfiguration?: unknown })
        .AuthorizerConfiguration,
    ).toBeUndefined();
  });

  it("S3 バケットを 3 つ持つ（レポート + 共有 skill + インシデント）", () => {
    template.resourceCountIs("AWS::S3::Bucket", 3);
  });

  it("レポート用 EventBridge Schedule を持つ", () => {
    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      Target: Match.objectLike({
        Arn: "arn:aws:scheduler:::aws-sdk:bedrockagentcore:invokeAgentRuntime",
      }),
    });
  });

  it("base skill を BucketDeployment で skills/ に seed する（prune 無効）", () => {
    // prune:false が重要 — 実行時生成の dynamic/ skill を毎デプロイで消さない。
    template.hasResourceProperties("Custom::CDKBucketDeployment", {
      DestinationBucketKeyPrefix: "skills/",
      Prune: false,
    });
  });

  it("chat はハブとして skills/* を読める", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:GetObject",
            Resource: { "Fn::Join": ["", Match.arrayWith(["/skills/*"])] },
          }),
        ]),
      }),
    });
  });

  it("report は自分の namespace(skills/report/*)のみ読める（chat の skill は読めない）", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:GetObject",
            Resource: {
              "Fn::Join": ["", Match.arrayWith(["/skills/report/*"])],
            },
          }),
          // ListBucket は prefix 条件で report 配下に限定される。
          Match.objectLike({
            Action: "s3:ListBucket",
            Condition: {
              StringLike: { "s3:prefix": Match.arrayWith(["skills/report/"]) },
            },
          }),
        ]),
      }),
    });
  });

  it("各エージェントは自分の dynamic namespace にのみ書ける", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:PutObject",
            Resource: {
              "Fn::Join": ["", Match.arrayWith(["/skills/chat/dynamic/*"])],
            },
          }),
        ]),
      }),
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:PutObject",
            Resource: {
              "Fn::Join": ["", Match.arrayWith(["/skills/report/dynamic/*"])],
            },
          }),
        ]),
      }),
    });
  });

  it("共有 skill バケット名を出力する", () => {
    const outputs = template.findOutputs("*");
    expect(Object.keys(outputs)).toEqual(
      expect.arrayContaining(["SkillsBucketName", "ReportsBucketName"]),
    );
  });

  it("レポート実行ロールが収集(read-only)権限を持つ", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["tag:GetResources", "cloudwatch:DescribeAlarms"]),
          }),
        ]),
      }),
    });
  });

  it("実行ロールが AgentCore Memory データプレーン権限を持つ", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              "bedrock-agentcore:CreateEvent",
              "bedrock-agentcore:RetrieveMemoryRecords",
            ]),
          }),
        ]),
      }),
    });
  });
});
