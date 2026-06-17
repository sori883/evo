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

  it("DynamoDB テーブルを 1 つ持つ", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 1);
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
