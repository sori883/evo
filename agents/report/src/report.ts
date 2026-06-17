import { z } from "zod";

/**
 * 運用レポートの構造（structuredOutputSchema として LLM に強制する）。
 * 各セクションの中身は LLM 生成の Markdown 断片。全体の章立て/フォーマットは
 * renderMarkdown が固定するため、フォーマットの再現性が保てる。
 */
export const reportSchema = z.object({
  summary: z.string().describe("エグゼクティブサマリ（数行）"),
  architecture: z.string().describe("システム構成の説明（Markdown）"),
  resources: z
    .array(
      z.object({
        type: z.string().describe("リソース種別（例: AWS::Lambda::Function）"),
        name: z.string().describe("リソース名/識別子"),
        notes: z.string().optional().describe("構成上の特記事項"),
      }),
    )
    .describe("把握したリソース一覧"),
  logs: z.string().describe("ログ観点の所見（Markdown）"),
  metrics: z.string().describe("メトリクス観点の所見（Markdown）"),
  alerts: z.string().describe("アラーム/アラート観点の所見（Markdown）"),
  vulnerabilities: z
    .string()
    .describe("脆弱性観点の所見。未有効なら『データなし（要有効化）』と明記"),
  recommendations: z.array(z.string()).describe("推奨対応（箇条書き）"),
});

export type Report = z.infer<typeof reportSchema>;

/** overlay（会話由来の追加指示）を踏まえた生成プロンプトを組む（純ロジック）。 */
export function buildReportPrompt(overlay: string[]): string {
  const base =
    "監視対象タグの付いたシステムについて、ツールで構成・ログ・メトリクス・アラート・脆弱性を調べ、運用レポートを生成してください。";
  const valid = overlay.map((s) => s.trim()).filter((s) => s.length > 0);
  if (valid.length === 0) {
    return base;
  }
  const lines = valid.map((s) => `- ${s}`).join("\n");
  return `${base}\n\n# 追加指示（会話由来。レポートに反映すること）\n${lines}`;
}

export type ReportMeta = {
  systemName: string;
  /** ISO 文字列。 */
  generatedAt: string;
  /** 適用した overlay（会話由来の追加指示）の要約。空なら表示しない。 */
  appliedOverlay?: string[];
};

function section(title: string, body: string): string {
  const trimmed = body.trim();
  return `## ${title}\n\n${trimmed.length > 0 ? trimmed : "_（データなし）_"}\n`;
}

/** 構造化レポートを固定フォーマットの Markdown にレンダリングする（純ロジック）。 */
export function renderMarkdown(report: Report, meta: ReportMeta): string {
  const lines: string[] = [];
  lines.push(`# 運用レポート: ${meta.systemName}`);
  lines.push("");
  lines.push(`> 生成日時: ${meta.generatedAt}`);
  lines.push("");

  lines.push(section("サマリ", report.summary));
  lines.push(section("構成", report.architecture));

  // リソース一覧（表）
  lines.push("### リソース一覧");
  lines.push("");
  if (report.resources.length === 0) {
    lines.push("_（対象リソースなし）_");
    lines.push("");
  } else {
    lines.push("| 種別 | 名前 | 備考 |");
    lines.push("|---|---|---|");
    for (const r of report.resources) {
      const notes = (r.notes ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| ${r.type} | ${r.name} | ${notes} |`);
    }
    lines.push("");
  }

  lines.push(section("ログ", report.logs));
  lines.push(section("メトリクス", report.metrics));
  lines.push(section("アラート", report.alerts));
  lines.push(section("脆弱性", report.vulnerabilities));

  // 推奨対応
  lines.push("## 推奨対応");
  lines.push("");
  if (report.recommendations.length === 0) {
    lines.push("_（特になし）_");
  } else {
    for (const rec of report.recommendations) {
      lines.push(`- ${rec.trim()}`);
    }
  }
  lines.push("");

  if (meta.appliedOverlay && meta.appliedOverlay.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("### 反映した追加指示（会話由来）");
    lines.push("");
    for (const o of meta.appliedOverlay) {
      lines.push(`- ${o.trim()}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
