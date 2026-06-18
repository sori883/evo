import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { createReportAgent } from "./agent.js";
import { loadEnv } from "./env.js";
import { OverlayReader } from "./overlay.js";
import {
  buildReportPrompt,
  renderConfigMarkdown,
  renderOperationsMarkdown,
  reportSchema,
} from "./report.js";
import { saveReport } from "./storage.js";

const env = loadEnv();
const s3 = new S3Client({ region: env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: env.AWS_REGION }),
);
const overlayReader = new OverlayReader(ddb, env.SHARED_TABLE_NAME);

/**
 * スケジュール(SigV4)で invoke される運用レポート生成ハンドラ。
 * overlay 読み込み → エージェントで収集/生成 → Markdown 整形 → S3 保存。
 * ストリーミングではなく結果オブジェクトを返す。
 */
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async () => {
      const overlay = await overlayReader.list().catch(() => []);

      const agent = createReportAgent(env);
      const result = await agent.invoke(buildReportPrompt(overlay));
      const report = reportSchema.parse(result.structuredOutput);

      const generatedAt = new Date().toISOString();
      const meta = { systemName: "evo", generatedAt, appliedOverlay: overlay };
      const configMd = renderConfigMarkdown(report, meta);
      const operationsMd = renderOperationsMarkdown(report, meta);

      const configSaved = await saveReport(
        s3,
        env.REPORTS_BUCKET,
        "config",
        configMd,
        generatedAt,
      );
      const opsSaved = await saveReport(
        s3,
        env.REPORTS_BUCKET,
        "operations",
        operationsMd,
        generatedAt,
      );

      return {
        ok: true,
        config: configSaved.key,
        operations: opsSaved.key,
        resources: report.config.resources.length,
      };
    },
  },
});

app.run();
