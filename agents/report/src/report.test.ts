import { describe, it, expect } from "vitest";
import {
  type Report,
  buildReportPrompt,
  parseRequestedKinds,
  renderConfigMarkdown,
  renderOperationsMarkdown,
} from "./report.js";

const base: Report = {
  config: {
    summary: "AgentCore と DynamoDB で構成。",
    architecture: "AgentCore Runtime と DynamoDB で構成。",
    resources: [
      { type: "AWS::DynamoDB::Table", name: "EvoStack-SharedData", notes: "PAY_PER_REQUEST" },
      { type: "AWS::Cognito::UserPool", name: "ap-northeast-1_xxx" },
    ],
  },
  operations: {
    summary: "概ね健全。",
    logs: "エラーは検出されず。",
    metrics: "p99 レイテンシ正常。",
    alerts: "発火中のアラームなし。",
    vulnerabilities: "データなし（要有効化）",
    recommendations: ["InvokeModel の resource をさらに限定", "Inspector を有効化"],
  },
};

const meta = { systemName: "evo", generatedAt: "2026-06-17T00:00:00Z" };

describe("renderConfigMarkdown", () => {
  it("生成日時を JST で表示する", () => {
    // meta.generatedAt = 2026-06-17T00:00:00Z → 09:00:00 JST
    const md = renderConfigMarkdown(base, meta);
    expect(md).toContain("> 生成日時: 2026-06-17 09:00:00 JST");
  });

  it("構成の章立てとリソース表を含み、運用セクションは含まない", () => {
    const md = renderConfigMarkdown(base, meta);
    expect(md).toContain("# 構成レポート: evo");
    expect(md).toContain("## サマリ");
    expect(md).toContain("## 構成");
    expect(md).toContain("### リソース一覧");
    expect(md).toContain("| AWS::DynamoDB::Table | EvoStack-SharedData | PAY_PER_REQUEST |");
    expect(md).not.toContain("## メトリクス");
    expect(md).not.toContain("## 脆弱性");
  });

  it("セル内の改行/パイプをエスケープ", () => {
    const md = renderConfigMarkdown(
      { ...base, config: { ...base.config, resources: [{ type: "X", name: "n", notes: "a|b\nc" }] } },
      meta,
    );
    expect(md).toContain("| X | n | a\\|b c |");
  });
});

describe("renderOperationsMarkdown", () => {
  it("運用の章立てと推奨を含み、構成のリソース表は含まない", () => {
    const md = renderOperationsMarkdown(base, meta);
    expect(md).toContain("# 運用レポート: evo");
    for (const h of ["## サマリ", "## ログ", "## メトリクス", "## アラート", "## 脆弱性", "## 推奨対応"]) {
      expect(md).toContain(h);
    }
    expect(md).toContain("- InvokeModel の resource をさらに限定");
    expect(md).not.toContain("### リソース一覧");
  });

  it("空配列/空セクションはプレースホルダ、overlay は末尾", () => {
    const md = renderOperationsMarkdown(
      { ...base, operations: { ...base.operations, logs: "", recommendations: [] } },
      { ...meta, appliedOverlay: ["コスト章を追加"] },
    );
    expect(md).toContain("_（データなし）_");
    expect(md).toContain("_（特になし）_");
    expect(md).toContain("### 反映した追加指示（会話由来）");
    expect(md).toContain("- コスト章を追加");
  });
});

describe("parseRequestedKinds", () => {
  it("指定された有効種別を返す", () => {
    expect(parseRequestedKinds({ kinds: ["config"] })).toEqual(["config"]);
    expect(parseRequestedKinds({ kinds: ["config", "operations"] })).toEqual([
      "config",
      "operations",
    ]);
  });
  it("未指定/不正/空は既定 operations", () => {
    expect(parseRequestedKinds({})).toEqual(["operations"]);
    expect(parseRequestedKinds(null)).toEqual(["operations"]);
    expect(parseRequestedKinds({ kinds: "config" })).toEqual(["operations"]);
    expect(parseRequestedKinds({ kinds: ["nope"] })).toEqual(["operations"]);
  });
});

describe("buildReportPrompt", () => {
  it("overlay 無しは基本プロンプト（構成と運用に分ける指示）", () => {
    const p = buildReportPrompt([]);
    expect(p).toContain("『構成』と『運用』");
    expect(p).not.toContain("追加指示");
  });
  it("overlay があれば箇条書きで追記", () => {
    const p = buildReportPrompt([" コスト章を追加 ", "", "構成図を載せて"]);
    expect(p).toContain("# 追加指示");
    expect(p).toContain("- コスト章を追加");
    expect(p).toContain("- 構成図を載せて");
  });
});
