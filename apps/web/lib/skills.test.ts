import { describe, expect, it } from "vitest";
import { toSkillList } from "./skills.js";

describe("toSkillList", () => {
  it("namespace 昇順 → base→dynamic → skill 昇順に整形し、不正キーは除外", () => {
    const list = toSkillList([
      { key: "skills/report/dynamic/report-generation/SKILL.md" },
      { key: "skills/chat/base/system-reporting/SKILL.md" },
      { key: "skills/report/base/report-generation/SKILL.md" },
      { key: "skills/report/base/cost-analysis/SKILL.md" },
      { key: "skills/report/base/report-generation/README.md" }, // SKILL.md 以外 → 除外
      { key: "skills/../base/x/SKILL.md" }, // パストラバーサル → 除外
    ]);

    expect(list.map((s) => s.key)).toEqual([
      "skills/chat/base/system-reporting/SKILL.md",
      "skills/report/base/cost-analysis/SKILL.md",
      "skills/report/base/report-generation/SKILL.md",
      "skills/report/dynamic/report-generation/SKILL.md",
    ]);
  });

  it("namespace / tier / skill を分解する", () => {
    const [s] = toSkillList([
      { key: "skills/report/dynamic/foo/SKILL.md", lastModified: "2026-06-19T00:00:00.000Z" },
    ]);
    expect(s).toMatchObject({
      namespace: "report",
      tier: "dynamic",
      skill: "foo",
      updatedAt: "2026-06-19T00:00:00.000Z",
    });
  });
});
