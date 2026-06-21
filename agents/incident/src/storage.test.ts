import { describe, expect, it, vi } from "vitest";
import { incidentKey, latestKey, saveIncident } from "./storage.js";

describe("incidentKey / latestKey", () => {
  it("履歴キーは時刻（コロン除去）＋スラッグ", () => {
    expect(incidentKey("2026-06-21T02:01:30.123Z", "evo-chat Errors!")).toBe(
      "incidents/2026-06-21T020130Z-evo-chat-errors.md",
    );
  });
  it("latest", () => {
    expect(latestKey()).toBe("incidents/latest.md");
  });
});

describe("saveIncident", () => {
  it("履歴 + latest の2回 put する", async () => {
    const send = vi.fn(async (_cmd: unknown) => ({}));
    const r = await saveIncident(
      { send },
      "bkt",
      "# md",
      "2026-06-21T02:01:30Z",
      "x",
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(r.latestKey).toBe("incidents/latest.md");
    expect(r.key).toContain("incidents/2026-06-21T020130Z-x.md");
  });
});
