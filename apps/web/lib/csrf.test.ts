import { describe, it, expect } from "vitest";
import { isSameOrigin } from "./csrf.js";

function headers(map: Record<string, string>) {
  return {
    get: (name: string): string | null => map[name.toLowerCase()] ?? null,
  };
}

describe("isSameOrigin", () => {
  it("Origin の host と Host が一致すれば true", () => {
    expect(
      isSameOrigin(headers({ origin: "https://evo.example.com", host: "evo.example.com" })),
    ).toBe(true);
    expect(
      isSameOrigin(headers({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).toBe(true);
  });

  it("別オリジンは false", () => {
    expect(
      isSameOrigin(headers({ origin: "https://evil.example.com", host: "evo.example.com" })),
    ).toBe(false);
  });

  it("Origin / Host 欠落は false（安全側）", () => {
    expect(isSameOrigin(headers({ host: "evo.example.com" }))).toBe(false);
    expect(isSameOrigin(headers({ origin: "https://evo.example.com" }))).toBe(false);
    expect(isSameOrigin(headers({ origin: "not a url", host: "evo.example.com" }))).toBe(false);
  });
});
