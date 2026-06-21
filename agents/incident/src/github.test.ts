import { describe, expect, it, vi } from "vitest";
import { openFixPr, parseRepo, safeBranch, toBase64 } from "./github.js";

describe("parseRepo", () => {
  it("owner/name を分解", () => {
    expect(parseRepo("sori883/evo")).toEqual({ owner: "sori883", name: "evo" });
  });
  it("不正形式は throw", () => {
    expect(() => parseRepo("evo")).toThrow();
    expect(() => parseRepo("")).toThrow();
  });
});

describe("safeBranch / toBase64", () => {
  it("ブランチ名を安全化", () => {
    expect(safeBranch("Incident/Fix Null Ref!!")).toBe("incident/fix-null-ref");
    expect(safeBranch("")).toBe("incident-fix");
  });
  it("base64", () => {
    expect(toBase64("hello")).toBe("aGVsbG8=");
  });
});

/** GitHub API 呼び出し列を順に応答するフェイク fetch。 */
function fakeFetch(handlers: Array<(url: string, init: RequestInit) => unknown>) {
  let i = 0;
  return vi.fn(async (url: string, init: RequestInit) => {
    const h = handlers[i++];
    const body = h ? h(url, init ?? {}) : { __status: 500 };
    const status = (body as { __status?: number })?.__status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  });
}

const ctx = (fetchImpl: ReturnType<typeof fakeFetch>) => ({
  repo: { owner: "sori883", name: "evo" },
  token: "tok",
  fetchImpl: fetchImpl as unknown as typeof fetch,
});

describe("openFixPr", () => {
  it("default branch→base sha→branch作成→ファイル更新→PR の順で作成", async () => {
    const calls: string[] = [];
    const fetchImpl = fakeFetch([
      () => { calls.push("GET repo"); return { default_branch: "main" }; },
      () => { calls.push("GET ref"); return { object: { sha: "basesha" } }; },
      () => { calls.push("POST refs"); return { ref: "refs/heads/incident/fix" }; },
      () => { calls.push("GET contents"); return { __status: 404 }; }, // 新規ファイル
      () => { calls.push("PUT contents"); return { content: { path: "a.ts" } }; },
      () => { calls.push("POST pulls"); return { html_url: "https://github.com/sori883/evo/pull/99", number: 99 }; },
    ]);
    const res = await openFixPr(ctx(fetchImpl), {
      title: "fix null ref",
      body: "原因/修正",
      branch: "incident/fix",
      files: [{ path: "a.ts", content: "fixed" }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.pr).toEqual({
        url: "https://github.com/sori883/evo/pull/99",
        number: 99,
        branch: "incident/fix",
      });
    }
    expect(calls).toEqual([
      "GET repo",
      "GET ref",
      "POST refs",
      "GET contents",
      "PUT contents",
      "POST pulls",
    ]);
    // PUT のペイロードに base64 と branch が入る
    const putCall = fetchImpl.mock.calls[4];
    const putBody = JSON.parse((putCall?.[1] as RequestInit).body as string);
    expect(putBody.branch).toBe("incident/fix");
    expect(putBody.content).toBe(toBase64("fixed"));
  });

  it("ファイル無しは ok:false", async () => {
    const res = await openFixPr(ctx(fakeFetch([])), {
      title: "x", body: "y", branch: "b", files: [],
    });
    expect(res.ok).toBe(false);
  });

  it("PR 作成が失敗したら ok:false", async () => {
    const fetchImpl = fakeFetch([
      () => ({ default_branch: "main" }),
      () => ({ object: { sha: "s" } }),
      () => ({ ref: "x" }),
      () => ({ __status: 404 }),
      () => ({ content: {} }),
      () => ({ __status: 422 }), // PR 失敗
    ]);
    const res = await openFixPr(ctx(fetchImpl), {
      title: "x", body: "y", branch: "b", files: [{ path: "a", content: "c" }],
    });
    expect(res.ok).toBe(false);
  });

  it("Authorization に Bearer token、token はそのまま外部に出さない（応答に含めない）", async () => {
    const fetchImpl = fakeFetch([
      () => ({ default_branch: "main" }),
      () => ({ object: { sha: "s" } }),
      () => ({ ref: "x" }),
      () => ({ __status: 404 }),
      () => ({ content: {} }),
      () => ({ html_url: "https://github.com/sori883/evo/pull/1", number: 1 }),
    ]);
    const res = await openFixPr(ctx(fetchImpl), {
      title: "x", body: "y", branch: "b", files: [{ path: "a", content: "c" }],
    });
    expect(res.ok).toBe(true);
    const headers = (fetchImpl.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(JSON.stringify(res)).not.toContain("tok");
  });
});
