import { describe, it, expect } from "vitest";
import { reportKey } from "./storage.js";

describe("reportKey", () => {
  it("コロン除去・ミリ秒除去した安全なキー", () => {
    expect(reportKey("2026-06-17T01:23:45.678Z")).toBe("reports/2026-06-17T012345Z.md");
  });
  it("ミリ秒が無くても動く", () => {
    expect(reportKey("2026-06-17T01:23:45Z")).toBe("reports/2026-06-17T012345Z.md");
  });
});
