import { formatJst } from "@evo/shared";
import { z } from "zod";
import type { AlarmContext } from "./alarm.js";

/**
 * トリアージ結果（structuredOutputSchema として LLM に強制する）。
 * 「対応要否」を中心に、根拠と推奨を構造化する。
 */
export const triageSchema = z.object({
  /** 対応が必要か（false=自然回復/誤検知/様子見）。 */
  needsAction: z.boolean().describe("対応が必要なら true、不要なら false"),
  severity: z
    .enum(["critical", "high", "medium", "low", "info"])
    .describe("深刻度"),
  summary: z.string().describe("状況の要約（数行）"),
  evidence: z.string().describe("観測した事実（ログ/メトリクス/アラーム）"),
  rootCauseHypothesis: z.string().describe("根本原因の仮説"),
  recommendation: z.string().describe("推奨対応（この MVP では実行はしない）"),
  affectedResources: z
    .array(z.string())
    .default([])
    .describe("影響を受けるリソース（ARN/名称）"),
});

export type Triage = z.infer<typeof triageSchema>;

/** 診断プロンプトを組む（純ロジック）。 */
export function buildDiagnosisPrompt(alarm: AlarmContext): string {
  const lines = [
    "次の CloudWatch アラームについて、与えられた read-only ツールで関連する",
    "ログ・メトリクス・アラーム・構成を調べ、根本原因を推定してください。",
    "そのうえで『対応が必要か（needsAction）』を、事実に基づいて判定します。",
    "誤検知・自然回復・一時的スパイクと判断できる場合は needsAction=false。",
    "",
    "# アラーム",
    `- 名前: ${alarm.alarmName}`,
    `- 状態: ${alarm.stateValue}${alarm.previousState ? `（前: ${alarm.previousState}）` : ""}`,
  ];
  if (alarm.namespace || alarm.metricName) {
    lines.push(`- メトリクス: ${alarm.namespace ?? "?"} / ${alarm.metricName ?? "?"}`);
  }
  if (alarm.reason) lines.push(`- 理由: ${alarm.reason}`);
  if (alarm.timestamp) lines.push(`- 時刻(UTC): ${alarm.timestamp}`);
  if (alarm.resources?.length) {
    lines.push(`- 関連リソース: ${alarm.resources.join(", ")}`);
  }
  return lines.join("\n");
}

export interface IncidentMeta {
  alarmName: string;
  /** 検知時刻（ISO, UTC）。 */
  detectedAt: string;
  /** 生成時刻（ISO, UTC）。 */
  generatedAt: string;
}

/** 対応要否の表示ラベル。 */
export function actionLabel(t: Triage): string {
  return t.needsAction ? "要対応" : "対応不要";
}

function section(title: string, body: string): string {
  const t = body.trim();
  return `## ${title}\n\n${t.length > 0 ? t : "_（データなし）_"}\n`;
}

/** インシデント診断レポートを固定フォーマットの Markdown にする（純ロジック・JST 表示）。 */
export function renderIncidentMarkdown(
  alarm: AlarmContext,
  t: Triage,
  meta: IncidentMeta,
): string {
  const lines: string[] = [
    `# インシデント: ${meta.alarmName}`,
    "",
    `> 検知日時: ${formatJst(meta.detectedAt)}　/　生成日時: ${formatJst(meta.generatedAt)}`,
    "",
    `**判定: ${actionLabel(t)}**　|　深刻度: ${t.severity}`,
    "",
  ];

  lines.push(section("サマリ", t.summary));

  lines.push("## アラーム");
  lines.push("");
  lines.push(`- 名前: ${alarm.alarmName}`);
  lines.push(`- 状態: ${alarm.stateValue}${alarm.previousState ? `（前: ${alarm.previousState}）` : ""}`);
  if (alarm.namespace || alarm.metricName) {
    lines.push(`- メトリクス: ${alarm.namespace ?? "?"} / ${alarm.metricName ?? "?"}`);
  }
  if (alarm.reason) lines.push(`- 理由: ${alarm.reason}`);
  lines.push("");

  lines.push(section("観測した事実", t.evidence));
  lines.push(section("根本原因の仮説", t.rootCauseHypothesis));
  lines.push(section("推奨対応", t.recommendation));

  lines.push("## 影響リソース");
  lines.push("");
  if (t.affectedResources.length === 0) {
    lines.push("_（特定なし）_");
  } else {
    for (const r of t.affectedResources) lines.push(`- ${r}`);
  }
  lines.push("");

  return `${lines.join("\n").trimEnd()}\n`;
}
