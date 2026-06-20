import { describe, expect, it } from "vitest";
import { formatJst, formatJstMinutes } from "./datetime.js";

describe("formatJst", () => {
  it("UTC を JST(+9) に変換して整形する", () => {
    expect(formatJst("2026-06-18T01:02:59Z")).toBe("2026-06-18 10:02:59 JST");
  });

  it("日付をまたぐ変換（UTC 深夜 → JST 翌朝）", () => {
    expect(formatJst("2026-06-18T20:30:00Z")).toBe("2026-06-19 05:30:00 JST");
  });

  it("ミリ秒付き ISO も扱える", () => {
    expect(formatJst("2026-06-19T05:01:10.123Z")).toBe(
      "2026-06-19 14:01:10 JST",
    );
  });

  it("不正な入力は空文字", () => {
    expect(formatJst("")).toBe("");
    expect(formatJst("not-a-date")).toBe("");
  });
});

describe("formatJstMinutes", () => {
  it("秒を省く", () => {
    expect(formatJstMinutes("2026-06-18T01:02:59Z")).toBe(
      "2026-06-18 10:02 JST",
    );
  });

  it("不正な入力は空文字", () => {
    expect(formatJstMinutes("nope")).toBe("");
  });
});
