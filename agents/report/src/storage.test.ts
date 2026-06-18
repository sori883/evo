import { describe, it, expect } from "vitest";
import { latestKey, reportKey } from "./storage.js";

describe("reportKey", () => {
  it("種別 + コロン除去・ミリ秒除去の安全なキー", () => {
    expect(reportKey("config", "2026-06-18T01:23:45.678Z")).toBe(
      "reports/config-2026-06-18T012345Z.md",
    );
    expect(reportKey("operations", "2026-06-18T01:23:45Z")).toBe(
      "reports/operations-2026-06-18T012345Z.md",
    );
  });
});

describe("latestKey", () => {
  it("種別ごとの latest", () => {
    expect(latestKey("config")).toBe("reports/config-latest.md");
    expect(latestKey("operations")).toBe("reports/operations-latest.md");
  });
});
