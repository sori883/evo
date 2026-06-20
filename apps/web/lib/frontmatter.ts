/**
 * SKILL.md などの YAML frontmatter（先頭の `--- ... ---`）を素朴にパースする。
 * 依存なし・クライアント安全（aws-sdk 等を含まない）。
 * 値は単一行 `key: value` のみ対応（skill の frontmatter はこの形式）。
 */
export type Frontmatter = {
  /** frontmatter の key/value（無ければ空）。 */
  attributes: Record<string, string>;
  /** frontmatter を除いた本文。 */
  body: string;
};

export function parseFrontmatter(md: string): Frontmatter {
  const m = md.match(/^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) {
    return { attributes: {}, body: md };
  }
  const attributes: Record<string, string> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    let value = line.slice(idx + 1).trim();
    // 任意の囲みクォートを外す
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    attributes[key] = value;
  }
  // frontmatter 直後の空行を落として本文を返す。
  const body = md.slice(m[0].length).replace(/^(?:\r?\n)+/, "");
  return { attributes, body };
}
