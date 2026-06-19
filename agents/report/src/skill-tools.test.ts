import { describe, expect, it, vi } from "vitest";
import { applyImproveSkill } from "./skill-tools.js";

const VALID = [
  "---",
  "name: report-cost-section",
  "description: コスト章を追加する手順",
  "---",
  "",
  "# コスト章",
].join("\n");

describe("applyImproveSkill", () => {
  it("妥当な skill を自分の dynamic namespace に保存する", async () => {
    const put = vi.fn(async () => {});
    const out = JSON.parse(
      await applyImproveSkill({ put }, "report", {
        name: "report-cost-section",
        content: VALID,
      }),
    );
    expect(out.ok).toBe(true);
    expect(out.key).toBe("skills/report/dynamic/report-cost-section/SKILL.md");
    expect(put).toHaveBeenCalledWith(
      "skills/report/dynamic/report-cost-section/SKILL.md",
      VALID,
    );
  });

  it("frontmatter 不備は保存せず ok:false", async () => {
    const put = vi.fn(async () => {});
    const out = JSON.parse(
      await applyImproveSkill({ put }, "report", {
        name: "bad",
        content: "# no frontmatter",
      }),
    );
    expect(out.ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("不正な skill 名(パストラバーサル)は保存せず ok:false", async () => {
    const put = vi.fn(async () => {});
    const out = JSON.parse(
      await applyImproveSkill({ put }, "report", {
        name: "../escape",
        content: VALID,
      }),
    );
    expect(out.ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("常に自分(report)の dynamic を指す（base や他 namespace に書けない）", async () => {
    const put = vi.fn(async (_key: string, _body: string) => {});
    await applyImproveSkill({ put }, "report", {
      name: "x",
      content: VALID,
    });
    const key = put.mock.calls[0]?.[0] ?? "";
    expect(key.startsWith("skills/report/dynamic/")).toBe(true);
    expect(key).not.toContain("/base/");
  });
});
