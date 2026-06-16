import { describe, it, expect, vi } from "vitest";
import { CognitoService } from "./cognito";

describe("CognitoService", () => {
  it("signIn は USER_PASSWORD_AUTH で InitiateAuth を送りトークンを返す", async () => {
    const send = vi.fn().mockResolvedValue({
      AuthenticationResult: {
        AccessToken: "access",
        IdToken: "id",
        RefreshToken: "refresh",
        ExpiresIn: 3600,
      },
    });
    const svc = new CognitoService({ send } as never, "client-1");
    const tokens = await svc.signIn("u@example.com", "password1");
    expect(send).toHaveBeenCalledOnce();
    expect(tokens).toEqual({
      accessToken: "access",
      idToken: "id",
      refreshToken: "refresh",
      expiresIn: 3600,
    });
  });

  it("signIn は AuthenticationResult が無ければ例外", async () => {
    const send = vi.fn().mockResolvedValue({});
    const svc = new CognitoService({ send } as never, "client-1");
    await expect(svc.signIn("u@example.com", "password1")).rejects.toThrow();
  });

  it("signUp は SignUp を送る", async () => {
    const send = vi.fn().mockResolvedValue({});
    const svc = new CognitoService({ send } as never, "client-1");
    await svc.signUp("u@example.com", "password1");
    expect(send).toHaveBeenCalledOnce();
  });

  it("confirm は ConfirmSignUp を送る", async () => {
    const send = vi.fn().mockResolvedValue({});
    const svc = new CognitoService({ send } as never, "client-1");
    await svc.confirm("u@example.com", "123456");
    expect(send).toHaveBeenCalledOnce();
  });

  it("refresh は REFRESH_TOKEN_AUTH でトークンを返す", async () => {
    const send = vi.fn().mockResolvedValue({
      AuthenticationResult: { AccessToken: "a2", IdToken: "i2", ExpiresIn: 3600 },
    });
    const svc = new CognitoService({ send } as never, "client-1");
    const tokens = await svc.refresh("refresh");
    expect(tokens.accessToken).toBe("a2");
    expect(tokens.refreshToken).toBeUndefined();
  });
});
