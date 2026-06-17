import { describe, it, expect } from "vitest";
import { type Report, buildReportPrompt, renderMarkdown } from "./report.js";

const base: Report = {
  summary: "概ね健全。",
  architecture: "AgentCore Runtime と DynamoDB で構成。",
  resources: [
    { type: "AWS::DynamoDB::Table", name: "EvoStack-SharedData", notes: "PAY_PER_REQUEST" },
    { type: "AWS::Cognito::UserPool", name: "ap-northeast-1_xxx" },
  ],
  logs: "エラーは検出されず。",
  metrics: "p99 レイテンシ正常。",
  alerts: "発火中のアラームなし。",
  vulnerabilities: "データなし（要有効化）",
  recommendations: ["InvokeModel の resource をさらに限定", "Inspector を有効化"],
};

const meta = { systemName: "evo", generatedAt: "2026-06-17T00:00:00Z" };

describe("renderMarkdown", () => {
  it("固定の章立てを含む", () => {
    const md = renderMarkdown(base, meta);
    expect(md).toContain("# 運用レポート: evo");
    expect(md).toContain("生成日時: 2026-06-17T00:00:00Z");
    for (const h of [
      "## サマリ",
      "## 構成",
      "### リソース一覧",
      "## ログ",
      "## メトリクス",
      "## アラート",
      "## 脆弱性",
      "## 推奨対応",
    ]) {
      expect(md).toContain(h);
    }
  });

  it("リソースを表に、推奨を箇条書きにする", () => {
    const md = renderMarkdown(base, meta);
    expect(md).toContain("| 種別 | 名前 | 備考 |");
    expect(md).toContain("| AWS::DynamoDB::Table | EvoStack-SharedData | PAY_PER_REQUEST |");
    expect(md).toContain("- InvokeModel の resource をさらに限定");
  });

  it("空セクション/空配列はプレースホルダ", () => {
    const md = renderMarkdown(
      { ...base, resources: [], logs: "", recommendations: [] },
      meta,
    );
    expect(md).toContain("_（対象リソースなし）_");
    expect(md).toContain("_（データなし）_");
    expect(md).toContain("_（特になし）_");
  });

  it("セル内の改行/パイプをエスケープして表を壊さない", () => {
    const md = renderMarkdown(
      { ...base, resources: [{ type: "X", name: "n", notes: "a|b\nc" }] },
      meta,
    );
    expect(md).toContain("| X | n | a\\|b c |");
  });

  it("overlay 指示があれば末尾に出す", () => {
    const md = renderMarkdown(base, { ...meta, appliedOverlay: ["コスト章を追加"] });
    expect(md).toContain("### 反映した追加指示（会話由来）");
    expect(md).toContain("- コスト章を追加");
  });
});

describe("buildReportPrompt", () => {
  it("overlay 無しは基本プロンプト", () => {
    const p = buildReportPrompt([]);
    expect(p).toContain("運用レポートを生成");
    expect(p).not.toContain("追加指示");
  });
  it("overlay があれば箇条書きで追記", () => {
    const p = buildReportPrompt([" コスト章を追加 ", "", "構成図を載せて"]);
    expect(p).toContain("# 追加指示");
    expect(p).toContain("- コスト章を追加");
    expect(p).toContain("- 構成図を載せて");
  });
});
