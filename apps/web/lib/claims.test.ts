import { describe, it, expect } from "vitest";
import { decodeClaims, getTokenExp, isTokenExpiringSoon } from "./claims.js";

/** テスト用に JWT 風の文字列（header.payload.signature）を作る。 */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(payload)}.sig`;
}

describe("decodeClaims", () => {
  it("sub と email を取り出す", () => {
    const token = makeJwt({ sub: "abc-123", email: "a@example.com" });
    expect(decodeClaims(token)).toEqual({ sub: "abc-123", email: "a@example.com" });
  });

  it("email が無ければ空文字にする", () => {
    const token = makeJwt({ sub: "abc-123" });
    expect(decodeClaims(token)).toEqual({ sub: "abc-123", email: "" });
  });

  it("undefined / 不正な形式は null", () => {
    expect(decodeClaims(undefined)).toBeNull();
    expect(decodeClaims(null)).toBeNull();
    expect(decodeClaims("not-a-jwt")).toBeNull();
    expect(decodeClaims("a.b")).toEqual(null); // payload が不正 JSON
  });

  it("sub が無ければ null", () => {
    const token = makeJwt({ email: "a@example.com" });
    expect(decodeClaims(token)).toBeNull();
  });
});

describe("getTokenExp", () => {
  it("exp(数値) を返す", () => {
    expect(getTokenExp(makeJwt({ exp: 1700000000 }))).toBe(1700000000);
  });
  it("exp 欠落 / 不正トークンは null", () => {
    expect(getTokenExp(makeJwt({ sub: "x" }))).toBeNull();
    expect(getTokenExp(undefined)).toBeNull();
    expect(getTokenExp("bad")).toBeNull();
  });
});

describe("isTokenExpiringSoon", () => {
  const now = 1_000_000_000_000; // 固定の現在時刻(ms)
  it("十分先に失効するなら false", () => {
    const token = makeJwt({ exp: now / 1000 + 3600 });
    expect(isTokenExpiringSoon(token, now)).toBe(false);
  });
  it("失効済み / 失効間近(skew内)なら true", () => {
    expect(isTokenExpiringSoon(makeJwt({ exp: now / 1000 - 10 }), now)).toBe(true);
    expect(isTokenExpiringSoon(makeJwt({ exp: now / 1000 + 20 }), now, 30)).toBe(true);
  });
  it("exp が取れなければ安全側で true", () => {
    expect(isTokenExpiringSoon(undefined, now)).toBe(true);
    expect(isTokenExpiringSoon(makeJwt({ sub: "x" }), now)).toBe(true);
  });
});
