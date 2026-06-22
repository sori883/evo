import { describe, it, expect } from "vitest";
import { eventsToMessages, deriveSessionTitle } from "./history.js";

describe("eventsToMessages", () => {
  it("USER/ASSISTANT の会話を順に並べる", () => {
    const events = [
      {
        payload: [
          { conversational: { role: "USER", content: { text: "こんにちは" } } },
          { conversational: { role: "ASSISTANT", content: { text: "やあ" } } },
        ],
      },
    ];
    expect(eventsToMessages(events)).toEqual([
      { role: "user", content: "こんにちは" },
      { role: "assistant", content: "やあ" },
    ]);
  });

  it("ListEvents（新しい順）を時系列昇順（古い→新しい）に並べ替える", () => {
    const events = [
      {
        payload: [
          { conversational: { role: "USER", content: { text: "新しい質問" } } },
          { conversational: { role: "ASSISTANT", content: { text: "新しい回答" } } },
        ],
      },
      {
        payload: [
          { conversational: { role: "USER", content: { text: "古い質問" } } },
          { conversational: { role: "ASSISTANT", content: { text: "古い回答" } } },
        ],
      },
    ];
    expect(eventsToMessages(events)).toEqual([
      { role: "user", content: "古い質問" },
      { role: "assistant", content: "古い回答" },
      { role: "user", content: "新しい質問" },
      { role: "assistant", content: "新しい回答" },
    ]);
  });

  it("空テキスト・未知 role・payload 無しを除外する", () => {
    const events = [
      { payload: [{ conversational: { role: "USER", content: { text: "" } } }] },
      { payload: [{ conversational: { role: "SYSTEM", content: { text: "x" } } }] },
      {},
    ];
    expect(eventsToMessages(events)).toEqual([]);
  });
});

describe("deriveSessionTitle", () => {
  it("最初のユーザー発話をタイトルにする", () => {
    expect(
      deriveSessionTitle([
        { role: "user", content: "天気を教えて" },
        { role: "assistant", content: "晴れです" },
      ]),
    ).toBe("天気を教えて");
  });

  it("30 文字超は省略する", () => {
    const long = "あ".repeat(40);
    expect(deriveSessionTitle([{ role: "user", content: long }])).toBe(
      `${"あ".repeat(30)}…`,
    );
  });

  it("空ならフォールバック", () => {
    expect(deriveSessionTitle([])).toBe("新しい会話");
  });
});
