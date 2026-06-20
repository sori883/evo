import { describe, it, expect } from "vitest";
import {
  jstifyGeneratedAt,
  parseKind,
  reportLabel,
  toReportList,
} from "./reports.js";

describe("parseKind", () => {
  it("プレフィックスから種別を判定", () => {
    expect(parseKind("config-latest.md")).toBe("config");
    expect(parseKind("operations-2026-06-18T010259Z.md")).toBe("operations");
    expect(parseKind("legacy.md")).toBeNull();
  });
});

describe("reportLabel", () => {
  it("latest は『最新』", () => {
    expect(reportLabel("config-latest.md")).toBe("最新");
  });
  it("タイムスタンプ名を JST 日時に整形", () => {
    // 01:02:59 UTC → 10:02:59 JST (+9h)
    expect(reportLabel("operations-2026-06-18T010259Z.md")).toBe(
      "2026-06-18 10:02:59 JST",
    );
  });
});

describe("jstifyGeneratedAt", () => {
  it("本文の生成日時(UTC ISO)を JST に変換する", () => {
    const md = "# 運用レポート: evo\n\n> 生成日時: 2026-06-19T05:01:10.123Z\n\n## サマリ";
    expect(jstifyGeneratedAt(md)).toContain("> 生成日時: 2026-06-19 14:01:10 JST");
  });

  it("既に JST 表記なら変更しない", () => {
    const md = "> 生成日時: 2026-06-19 14:01:10 JST";
    expect(jstifyGeneratedAt(md)).toBe(md);
  });
});

describe("toReportList", () => {
  it("種別ごとに latest 先頭・新しい順、種別不明は除外", () => {
    const list = toReportList([
      { key: "reports/config-2026-06-18T010000Z.md" },
      { key: "reports/config-latest.md" },
      { key: "reports/operations-2026-06-18T010000Z.md" },
      { key: "reports/operations-2026-06-18T020000Z.md" },
      { key: "reports/operations-latest.md" },
      { key: "reports/latest.md" }, // 旧統合 → 除外
    ]);
    // 旧統合(latest.md)は除外される
    expect(list.some((r) => r.name === "latest.md")).toBe(false);
    // 種別ごとに latest 先頭・以降は日時降順
    expect(list.filter((r) => r.kind === "config").map((r) => r.name)).toEqual([
      "config-latest.md",
      "config-2026-06-18T010000Z.md",
    ]);
    expect(list.filter((r) => r.kind === "operations").map((r) => r.name)).toEqual([
      "operations-latest.md",
      "operations-2026-06-18T020000Z.md",
      "operations-2026-06-18T010000Z.md",
    ]);
  });
});
