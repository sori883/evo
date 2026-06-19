import { describe, expect, it, vi } from "vitest";
import {
  HUB_AGENT,
  SKILLS_ROOT,
  type SkillStorage,
  assertValidSkillContent,
  assertValidSkillName,
  buildDynamicSkillKey,
  isWritableByAgent,
  localSkillFile,
  materializeSkills,
  namespacePrefix,
  parseSkillKey,
  readableNamespaces,
  resolveSkillKeys,
} from "./skills.js";

const SKILL_MD = ["---", "name: demo", "description: a demo skill", "---", "", "# Demo"].join(
  "\n",
);

describe("readableNamespaces", () => {
  it("hub(chat) は全 namespace を読める", () => {
    expect(readableNamespaces(HUB_AGENT, ["chat", "report", "audit"])).toEqual([
      "chat",
      "report",
      "audit",
    ]);
  });

  it("hub の結果は重複排除される", () => {
    expect(readableNamespaces(HUB_AGENT, ["report", "report", "chat"])).toEqual([
      "report",
      "chat",
    ]);
  });

  it("非hub は自分の namespace のみ", () => {
    expect(readableNamespaces("report", ["chat", "report", "audit"])).toEqual([
      "report",
    ]);
  });

  it("非hub は他に何が存在しても自分だけ（chat の skill は読めない）", () => {
    expect(readableNamespaces("audit", ["chat", "report", "audit"])).toEqual([
      "audit",
    ]);
  });
});

describe("namespacePrefix / parseSkillKey / localSkillFile", () => {
  it("namespacePrefix", () => {
    expect(namespacePrefix("report")).toBe("skills/report/");
  });

  it("parseSkillKey: 正しい base キー", () => {
    expect(parseSkillKey("skills/report/base/report-generation/SKILL.md")).toEqual({
      namespace: "report",
      tier: "base",
      skill: "report-generation",
    });
  });

  it("parseSkillKey: 正しい dynamic キー", () => {
    expect(parseSkillKey("skills/chat/dynamic/foo/SKILL.md")).toEqual({
      namespace: "chat",
      tier: "dynamic",
      skill: "foo",
    });
  });

  it("parseSkillKey: 不正な tier は null", () => {
    expect(parseSkillKey("skills/report/other/foo/SKILL.md")).toBeNull();
  });

  it("parseSkillKey: SKILL.md 以外は null", () => {
    expect(parseSkillKey("skills/report/base/foo/README.md")).toBeNull();
  });

  it("parseSkillKey: 階層不足は null", () => {
    expect(parseSkillKey("skills/report/base/SKILL.md")).toBeNull();
  });

  it("parseSkillKey: パストラバーサル(..)を含むセグメントは null", () => {
    expect(parseSkillKey("skills/../base/x/SKILL.md")).toBeNull();
    expect(parseSkillKey("skills/report/base/../SKILL.md")).toBeNull();
    expect(parseSkillKey("skills/report/dynamic/.././SKILL.md")).toBeNull();
    expect(parseSkillKey("skills/Report/base/x/SKILL.md")).toBeNull();
  });

  it("materializeSkills/localSkillFile はパストラバーサルキーを無視する", async () => {
    const get = vi.fn(async () => "x");
    const written: string[] = [];
    const dirs = await materializeSkills(
      { get },
      "/tmp/skills",
      ["skills/../base/x/SKILL.md"],
      async (p: string) => {
        written.push(p);
      },
    );
    expect(dirs).toEqual([]);
    expect(written).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it("localSkillFile: tier を含めて衝突回避", () => {
    expect(localSkillFile("/tmp/skills", "skills/report/base/foo/SKILL.md")).toBe(
      "/tmp/skills/report/base/foo/SKILL.md",
    );
  });
});

describe("resolveSkillKeys", () => {
  function fakeStorage(map: Record<string, string[]>): SkillStorage {
    return {
      listNamespaces: vi.fn(async () => Object.keys(map)),
      listKeys: vi.fn(async (ns: string) => map[ns] ?? []),
      get: vi.fn(async () => ""),
      put: vi.fn(async () => {}),
    };
  }

  it("hub は全 namespace のキーを集める", async () => {
    const storage = fakeStorage({
      chat: ["skills/chat/base/c/SKILL.md"],
      report: ["skills/report/base/r/SKILL.md"],
    });
    const keys = await resolveSkillKeys(storage, HUB_AGENT);
    expect(keys.sort()).toEqual([
      "skills/chat/base/c/SKILL.md",
      "skills/report/base/r/SKILL.md",
    ]);
  });

  it("非hub は自分のキーのみ（他 namespace の listKeys を呼ばない）", async () => {
    const storage = fakeStorage({
      chat: ["skills/chat/base/c/SKILL.md"],
      report: ["skills/report/base/r/SKILL.md"],
    });
    const keys = await resolveSkillKeys(storage, "report");
    expect(keys).toEqual(["skills/report/base/r/SKILL.md"]);
    expect(storage.listKeys).toHaveBeenCalledTimes(1);
    expect(storage.listKeys).toHaveBeenCalledWith("report");
  });
});

describe("materializeSkills", () => {
  it("各キーを取得して書き込み、一意な skill dir を返す", async () => {
    const storage: SkillStorage = {
      listNamespaces: vi.fn(async () => []),
      listKeys: vi.fn(async () => []),
      get: vi.fn(async (key: string) => `body:${key}`),
      put: vi.fn(async () => {}),
    };
    const written: Record<string, string> = {};
    const writeFile = vi.fn(async (path: string, content: string) => {
      written[path] = content;
    });

    const dirs = await materializeSkills(
      storage,
      "/tmp/skills",
      [
        "skills/report/base/foo/SKILL.md",
        "skills/report/dynamic/bar/SKILL.md",
        "skills/report/base/foo/SKILL.md", // 重複
        "skills/report/base/bad", // 不正キー → 無視
      ],
      writeFile,
    );

    expect(written["/tmp/skills/report/base/foo/SKILL.md"]).toBe(
      "body:skills/report/base/foo/SKILL.md",
    );
    expect(dirs.sort()).toEqual([
      "/tmp/skills/report/base/foo",
      "/tmp/skills/report/dynamic/bar",
    ]);
    // 不正キーは get しない
    expect(storage.get).toHaveBeenCalledTimes(2);
  });
});

describe("書込ガード", () => {
  it("assertValidSkillName: 妥当な kebab は通る", () => {
    expect(() => assertValidSkillName("report-generation")).not.toThrow();
    expect(() => assertValidSkillName("a")).not.toThrow();
  });

  it("assertValidSkillName: 不正名は throw", () => {
    expect(() => assertValidSkillName("Foo")).toThrow();
    expect(() => assertValidSkillName("../etc")).toThrow();
    expect(() => assertValidSkillName("a/b")).toThrow();
    expect(() => assertValidSkillName("-bad")).toThrow();
    expect(() => assertValidSkillName("")).toThrow();
  });

  it("assertValidSkillContent: frontmatter(name+description) 必須", () => {
    expect(() => assertValidSkillContent(SKILL_MD, 65536)).not.toThrow();
    expect(() => assertValidSkillContent("# no frontmatter", 65536)).toThrow();
    expect(() =>
      assertValidSkillContent("---\nname: x\n---\nbody", 65536),
    ).toThrow(); // description 欠如
  });

  it("assertValidSkillContent: サイズ上限超過は throw", () => {
    const big = `---\nname: x\ndescription: y\n---\n${"a".repeat(100)}`;
    expect(() => assertValidSkillContent(big, 50)).toThrow();
  });

  it("buildDynamicSkillKey: 常に自分の dynamic namespace を指す", () => {
    expect(buildDynamicSkillKey("report", "new-skill")).toBe(
      "skills/report/dynamic/new-skill/SKILL.md",
    );
    const parsed = parseSkillKey(buildDynamicSkillKey("chat", "x"));
    expect(parsed?.tier).toBe("dynamic");
    expect(parsed?.namespace).toBe("chat");
  });

  it("buildDynamicSkillKey: 不正な skill 名は throw", () => {
    expect(() => buildDynamicSkillKey("report", "../escape")).toThrow();
  });

  it("isWritableByAgent: 自分の dynamic のみ true", () => {
    expect(isWritableByAgent("report", "skills/report/dynamic/x/SKILL.md")).toBe(
      true,
    );
    // base は不可
    expect(isWritableByAgent("report", "skills/report/base/x/SKILL.md")).toBe(
      false,
    );
    // 他 namespace は不可
    expect(isWritableByAgent("report", "skills/chat/dynamic/x/SKILL.md")).toBe(
      false,
    );
  });
});

describe("定数", () => {
  it("SKILLS_ROOT / HUB_AGENT", () => {
    expect(SKILLS_ROOT).toBe("skills");
    expect(HUB_AGENT).toBe("chat");
  });
});
