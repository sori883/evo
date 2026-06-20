import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("name/description を抽出し本文を分離する", () => {
    const md = [
      "---",
      "name: system-reporting",
      "description: システムについて答える手順",
      "---",
      "",
      "# 見出し",
      "本文",
    ].join("\n");
    const { attributes, body } = parseFrontmatter(md);
    expect(attributes.name).toBe("system-reporting");
    expect(attributes.description).toBe("システムについて答える手順");
    expect(body).toBe("# 見出し\n本文");
  });

  it("frontmatter が無ければ全体を本文として返す", () => {
    const md = "# frontmatter なし\n本文";
    expect(parseFrontmatter(md)).toEqual({ attributes: {}, body: md });
  });

  it("値の囲みクォートを外す", () => {
    const md = ['---', 'name: "x"', "title: 'y'", "---", "body"].join("\n");
    const { attributes } = parseFrontmatter(md);
    expect(attributes.name).toBe("x");
    expect(attributes.title).toBe("y");
  });

  it("description にコロンが含まれても最初の : で分割する", () => {
    const md = ["---", "description: a: b: c", "---", ""].join("\n");
    expect(parseFrontmatter(md).attributes.description).toBe("a: b: c");
  });
});
