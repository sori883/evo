import { describe, it, expect } from "vitest";
import { reportLabel, toReportList } from "./reports.js";

describe("reportLabel", () => {
  it("latest は『最新』", () => {
    expect(reportLabel("latest.md")).toBe("最新");
  });
  it("タイムスタンプ名を日時に整形", () => {
    expect(reportLabel("2026-06-18T010259Z.md")).toBe("2026-06-18 01:02:59 UTC");
  });
  it("想定外名は拡張子を落とすだけ", () => {
    expect(reportLabel("memo.md")).toBe("memo");
  });
});

describe("toReportList", () => {
  it("latest を先頭、履歴は新しい順", () => {
    const list = toReportList([
      { key: "reports/2026-06-18T010000Z.md", lastModified: "2026-06-18T01:00:00Z" },
      { key: "reports/latest.md", lastModified: "2026-06-18T02:00:00Z" },
      { key: "reports/2026-06-18T020000Z.md", lastModified: "2026-06-18T02:00:00Z" },
    ]);
    expect(list.map((r) => r.name)).toEqual([
      "latest.md",
      "2026-06-18T020000Z.md",
      "2026-06-18T010000Z.md",
    ]);
    expect(list[0]?.label).toBe("最新");
  });
  it(".md 以外は除外", () => {
    expect(toReportList([{ key: "reports/x.txt" }])).toEqual([]);
  });
});
