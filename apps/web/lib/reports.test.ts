import { describe, it, expect } from "vitest";
import { parseKind, reportLabel, toReportList } from "./reports.js";

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
  it("タイムスタンプ名を日時に整形", () => {
    expect(reportLabel("operations-2026-06-18T010259Z.md")).toBe(
      "2026-06-18 01:02:59 UTC",
    );
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
