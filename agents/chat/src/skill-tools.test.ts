import { describe, expect, it, vi } from "vitest";
import { applyImproveSkill } from "./skill-tools.js";

const VALID = [
  "---",
  "name: explain-architecture",
  "description: 構成説明の手順",
  "---",
  "",
  "# 構成説明",
].join("\n");

describe("applyImproveSkill (chat)", () => {
  it("妥当な skill を chat の dynamic namespace に保存する", async () => {
    const put = vi.fn(async (_key: string, _body: string) => {});
    const out = JSON.parse(
      await applyImproveSkill({ put }, "chat", {
        name: "explain-architecture",
        content: VALID,
      }),
    );
    expect(out.ok).toBe(true);
    expect(out.key).toBe("skills/chat/dynamic/explain-architecture/SKILL.md");
    expect(put).toHaveBeenCalledWith(out.key, VALID);
  });

  it("frontmatter 不備は保存せず ok:false", async () => {
    const put = vi.fn(async (_key: string, _body: string) => {});
    const out = JSON.parse(
      await applyImproveSkill({ put }, "chat", {
        name: "bad",
        content: "本文のみ",
      }),
    );
    expect(out.ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("常に自分(chat)の dynamic を指す（base や他 namespace に書けない）", async () => {
    const put = vi.fn(async (_key: string, _body: string) => {});
    await applyImproveSkill({ put }, "chat", { name: "x", content: VALID });
    const key = put.mock.calls[0]?.[0] ?? "";
    expect(key.startsWith("skills/chat/dynamic/")).toBe(true);
    expect(key).not.toContain("/base/");
    expect(key).not.toContain("/report/");
  });
});
