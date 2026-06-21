import { describe, expect, it } from "vitest";
import { incidentLabel, toIncidentList } from "./incidents.js";

describe("incidentLabel", () => {
  it("latest は『最新』", () => {
    expect(incidentLabel("latest.md")).toEqual({ label: "最新", alarmName: "" });
  });
  it("日時(UTC)＋アラーム名 → JST ラベル", () => {
    // 03:37:14 UTC → 12:37:14 JST
    expect(incidentLabel("2026-06-21T033714Z-evo-test-errors.md")).toEqual({
      label: "2026-06-21 12:37:14 JST　evo-test-errors",
      alarmName: "evo-test-errors",
    });
  });
});

describe("toIncidentList", () => {
  it("latest 先頭・以降は日時降順、md 以外は除外", () => {
    const list = toIncidentList([
      { key: "incidents/2026-06-21T010000Z-a.md" },
      { key: "incidents/latest.md" },
      { key: "incidents/2026-06-21T020000Z-b.md" },
      { key: "incidents/notes.txt" },
    ]);
    expect(list.map((i) => i.name)).toEqual([
      "latest.md",
      "2026-06-21T020000Z-b.md",
      "2026-06-21T010000Z-a.md",
    ]);
  });
});
