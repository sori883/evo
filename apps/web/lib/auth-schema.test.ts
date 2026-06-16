import { describe, it, expect } from "vitest";
import { signInSchema, confirmSchema } from "./auth-schema";

describe("signInSchema", () => {
  it("正しい email と 8 文字以上の password を受理", () => {
    const r = signInSchema.safeParse({ email: "u@example.com", password: "password1" });
    expect(r.success).toBe(true);
  });

  it("不正な email を拒否", () => {
    expect(signInSchema.safeParse({ email: "x", password: "password1" }).success).toBe(
      false,
    );
  });

  it("短い password を拒否", () => {
    expect(
      signInSchema.safeParse({ email: "u@example.com", password: "short" }).success,
    ).toBe(false);
  });
});

describe("confirmSchema", () => {
  it("email と code を受理", () => {
    expect(
      confirmSchema.safeParse({ email: "u@example.com", code: "123456" }).success,
    ).toBe(true);
  });

  it("空の code を拒否", () => {
    expect(confirmSchema.safeParse({ email: "u@example.com", code: "" }).success).toBe(
      false,
    );
  });
});
