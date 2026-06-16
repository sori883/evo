import { describe, it, expect, vi } from "vitest";
import { extractBearerToken, verifyAndGetSub } from "./auth.js";

describe("extractBearerToken", () => {
  it("authorization から Bearer を除去する", () => {
    expect(extractBearerToken({ authorization: "Bearer abc.def.ghi" })).toBe(
      "abc.def.ghi",
    );
  });

  it("Authorization（大文字）も許容する", () => {
    expect(extractBearerToken({ Authorization: "Bearer xyz" })).toBe("xyz");
  });

  it("ヘッダ欠落時は例外", () => {
    expect(() => extractBearerToken({})).toThrow();
  });

  it("Bearer スキーム欠落時は例外", () => {
    expect(() => extractBearerToken({ authorization: "abc" })).toThrow();
  });
});

describe("verifyAndGetSub", () => {
  it("verifier.verify の sub を返す", async () => {
    const verifier = { verify: vi.fn().mockResolvedValue({ sub: "user-123" }) };
    const sub = await verifyAndGetSub(verifier as never, {
      authorization: "Bearer tok",
    });
    expect(verifier.verify).toHaveBeenCalledWith("tok");
    expect(sub).toBe("user-123");
  });
});
