import { describe, it, expect } from "vitest";
import { decodeClaims } from "./claims.js";

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
