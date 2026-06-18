import { z } from "zod";

/**
 * 運用レポートの構造（structuredOutputSchema として LLM に強制する）。
 * 「構成」と「運用」を別ドキュメントに分割して出力するため、グループを分ける。
 * 各セクションの中身は LLM 生成の Markdown 断片。章立て/フォーマットは
 * render*Markdown が固定するため、フォーマットの再現性が保てる。
 */
export const reportSchema = z.object({
  /** 構成レポート（アーキテクチャ/リソース）。 */
  config: z.object({
    summary: z.string().describe("構成の要約（数行）"),
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
  }),
  /** 運用レポート（ログ/メトリクス/アラート/脆弱性/推奨）。 */
  operations: z.object({
    summary: z.string().describe("運用状況の要約（数行）"),
    logs: z.string().describe("ログ観点の所見（Markdown）"),
    metrics: z.string().describe("メトリクス観点の所見（Markdown）"),
    alerts: z.string().describe("アラーム/アラート観点の所見（Markdown）"),
    vulnerabilities: z
      .string()
      .describe("脆弱性観点の所見。未有効なら『データなし（要有効化）』と明記"),
    recommendations: z.array(z.string()).describe("推奨対応（箇条書き）"),
  }),
});

export type Report = z.infer<typeof reportSchema>;

/** レポート種別。 */
export type ReportKind = "config" | "operations";

export type ReportMeta = {
  systemName: string;
  /** ISO 文字列。 */
  generatedAt: string;
  /** 適用した overlay（会話由来の追加指示）の要約。空なら表示しない。 */
  appliedOverlay?: string[];
};

/** overlay（会話由来の追加指示）を踏まえた生成プロンプトを組む（純ロジック）。 */
export function buildReportPrompt(overlay: string[]): string {
  const base =
    "監視対象タグの付いたシステムについて、ツールで構成・ログ・メトリクス・アラート・脆弱性を調べ、" +
    "『構成』と『運用』に分けてレポートを生成してください。";
  const valid = overlay.map((s) => s.trim()).filter((s) => s.length > 0);
  if (valid.length === 0) {
    return base;
  }
  const lines = valid.map((s) => `- ${s}`).join("\n");
  return `${base}\n\n# 追加指示（会話由来。レポートに反映すること）\n${lines}`;
}

function section(title: string, body: string): string {
  const trimmed = body.trim();
  return `## ${title}\n\n${trimmed.length > 0 ? trimmed : "_（データなし）_"}\n`;
}

function header(title: string, meta: ReportMeta): string[] {
  return [`# ${title}: ${meta.systemName}`, "", `> 生成日時: ${meta.generatedAt}`, ""];
}

function overlayFooter(meta: ReportMeta): string[] {
  if (!meta.appliedOverlay || meta.appliedOverlay.length === 0) {
    return [];
  }
  const lines = ["---", "", "### 反映した追加指示（会話由来）", ""];
  for (const o of meta.appliedOverlay) {
    lines.push(`- ${o.trim()}`);
  }
  lines.push("");
  return lines;
}

/** 構成レポートを固定フォーマットの Markdown にレンダリングする（純ロジック）。 */
export function renderConfigMarkdown(report: Report, meta: ReportMeta): string {
  const c = report.config;
  const lines: string[] = header("構成レポート", meta);

  lines.push(section("サマリ", c.summary));
  lines.push(section("構成", c.architecture));

  lines.push("### リソース一覧");
  lines.push("");
  if (c.resources.length === 0) {
    lines.push("_（対象リソースなし）_");
    lines.push("");
  } else {
    lines.push("| 種別 | 名前 | 備考 |");
    lines.push("|---|---|---|");
    for (const r of c.resources) {
      const notes = (r.notes ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| ${r.type} | ${r.name} | ${notes} |`);
    }
    lines.push("");
  }

  lines.push(...overlayFooter(meta));
  return `${lines.join("\n").trimEnd()}\n`;
}

/** 運用レポートを固定フォーマットの Markdown にレンダリングする（純ロジック）。 */
export function renderOperationsMarkdown(report: Report, meta: ReportMeta): string {
  const o = report.operations;
  const lines: string[] = header("運用レポート", meta);

  lines.push(section("サマリ", o.summary));
  lines.push(section("ログ", o.logs));
  lines.push(section("メトリクス", o.metrics));
  lines.push(section("アラート", o.alerts));
  lines.push(section("脆弱性", o.vulnerabilities));

  lines.push("## 推奨対応");
  lines.push("");
  if (o.recommendations.length === 0) {
    lines.push("_（特になし）_");
  } else {
    for (const rec of o.recommendations) {
      lines.push(`- ${rec.trim()}`);
    }
  }
  lines.push("");

  lines.push(...overlayFooter(meta));
  return `${lines.join("\n").trimEnd()}\n`;
}
