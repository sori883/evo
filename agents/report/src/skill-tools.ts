import {
  type SkillStorage,
  assertValidSkillContent,
  buildDynamicSkillKey,
} from "@evo/shared";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

/**
 * improve_skill の本体（純ロジック）。検証 → 自分の dynamic namespace へ保存。
 * base skill は構造的に上書きできない（buildDynamicSkillKey が常に自分の
 * dynamic を指す）。tool 内部に依存せずテストできるよう関数として切り出す。
 */
export async function applyImproveSkill(
  storage: Pick<SkillStorage, "put">,
  agentId: string,
  input: { name: string; content: string },
): Promise<string> {
  try {
    assertValidSkillContent(input.content);
    const key = buildDynamicSkillKey(agentId, input.name);
    await storage.put(key, input.content);
    return JSON.stringify({
      ok: true,
      key,
      note: "保存しました。次回起動から適用されます。",
    });
  } catch (e) {
    return JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * 自己改善ツール。エージェントが自分の手順(skill)を dynamic namespace に
 * 追加・更新する。反映は次回起動から。
 */
export function createSkillTools(storage: SkillStorage, agentId: string) {
  const improveSkill = tool({
    name: "improve_skill",
    description:
      "自分の作業手順(skill)を改善・追加する。SKILL.md 全文（先頭に frontmatter `--- name: ... description: ... ---` が必須）を自分の dynamic namespace に保存する。次回起動から適用される。base(リポジトリ由来)skill は上書きできない。",
    inputSchema: z.object({
      name: z
        .string()
        .describe("skill 名（kebab-case, 例: report-cost-section）"),
      content: z.string().describe("SKILL.md の全文（frontmatter 必須）"),
    }),
    callback: (input) => applyImproveSkill(storage, agentId, input),
  });

  return [improveSkill];
}
