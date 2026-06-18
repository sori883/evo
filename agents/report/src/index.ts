import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { createReportAgent } from "./agent.js";
import { loadEnv } from "./env.js";
import { OverlayReader } from "./overlay.js";
import {
  buildReportPrompt,
  parseRequestedKinds,
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
    process: async (request) => {
      // payload で指定された種別だけを保存する（定時=operations のみ、構成は明示時）。
      const kinds = parseRequestedKinds(request);
      const overlay = await overlayReader.list().catch(() => []);

      const agent = createReportAgent(env);
      const result = await agent.invoke(buildReportPrompt(overlay));
      const report = reportSchema.parse(result.structuredOutput);

      const generatedAt = new Date().toISOString();
      const meta = { systemName: "evo", generatedAt, appliedOverlay: overlay };

      const saved: Partial<Record<"config" | "operations", string>> = {};
      if (kinds.includes("config")) {
        const r = await saveReport(
          s3,
          env.REPORTS_BUCKET,
          "config",
          renderConfigMarkdown(report, meta),
          generatedAt,
        );
        saved.config = r.key;
      }
      if (kinds.includes("operations")) {
        const r = await saveReport(
          s3,
          env.REPORTS_BUCKET,
          "operations",
          renderOperationsMarkdown(report, meta),
          generatedAt,
        );
        saved.operations = r.key;
      }

      return { ok: true, kinds, ...saved };
    },
  },
});

app.run();
