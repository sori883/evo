import { describe, it, expect } from "vitest";
import { extractInstructions } from "./overlay.js";

describe("extractInstructions", () => {
  it("instruction 文字列だけを trim して抽出する", () => {
    expect(
      extractInstructions([
        { instruction: " コスト章を追加 " },
        { instruction: "構成図を載せて" },
      ]),
    ).toEqual(["コスト章を追加", "構成図を載せて"]);
  });

  it("空/欠落/非文字列は除外する", () => {
    expect(
      extractInstructions([
        { instruction: "" },
        { instruction: "  " },
        { instruction: 123 as unknown as string },
        {},
        { instruction: "有効" },
      ]),
    ).toEqual(["有効"]);
  });
});
