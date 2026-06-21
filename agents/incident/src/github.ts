import { tool } from "@strands-agents/sdk";
import { z } from "zod";

/**
 * GitHub REST API ベースのコード対処ツール群。
 * AgentCore ランタイムに git バイナリが無い前提で、clone せず REST API のみで
 * コード読込→ブランチ作成→ファイル更新→PR 作成を行う。
 * 認証は fine-grained PAT（env EVO_GITHUB_PAT）。secret はログ/PR に出さない。
 */

export interface GithubRepo {
  owner: string;
  name: string;
}

/** "owner/name" を分解する（純ロジック）。 */
export function parseRepo(repo: string): GithubRepo {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`不正なリポジトリ指定: ${JSON.stringify(repo)}（owner/name 形式）`);
  }
  return { owner, name };
}

/** UTF-8 文字列を base64 に（GitHub Contents API 用）。 */
export function toBase64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

/** ブランチ名を安全化（英数・ハイフン・スラッシュのみ）。 */
export function safeBranch(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "incident-fix";
}

export type FetchLike = typeof fetch;

export interface CreatedPr {
  url: string;
  number: number;
  branch: string;
}

export interface GithubState {
  /** 直近に作成した PR（index.ts がレポートに載せる）。 */
  lastPr?: CreatedPr;
}

interface ApiCtx {
  repo: GithubRepo;
  token: string;
  fetchImpl: FetchLike;
}

async function api(
  ctx: ApiCtx,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await ctx.fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "evo-incident-agent",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

const repoPath = (r: GithubRepo) => `/repos/${r.owner}/${r.name}`;

/** 既定ブランチ名を取得する。 */
async function getDefaultBranch(ctx: ApiCtx): Promise<string> {
  const r = await api(ctx, "GET", repoPath(ctx.repo));
  const branch = (r.json as { default_branch?: string } | null)?.default_branch;
  return branch ?? "main";
}

/**
 * 1つ以上のファイル変更を新ブランチに載せ、PR を作成する（純オーケストレーション）。
 * 失敗時は {ok:false,error} を返し throw しない。
 */
export async function openFixPr(
  ctx: ApiCtx,
  input: {
    title: string;
    body: string;
    branch: string;
    files: { path: string; content: string }[];
  },
): Promise<{ ok: true; pr: CreatedPr } | { ok: false; error: string }> {
  try {
    if (input.files.length === 0) {
      return { ok: false, error: "変更ファイルがありません" };
    }
    const base = await getDefaultBranch(ctx);
    const branch = safeBranch(input.branch);

    // base の HEAD sha
    const ref = await api(
      ctx,
      "GET",
      `${repoPath(ctx.repo)}/git/ref/heads/${base}`,
    );
    if (!ref.ok) {
      return { ok: false, error: `base ref 取得失敗 (HTTP ${ref.status})` };
    }
    const baseSha = (ref.json as { object?: { sha?: string } }).object?.sha;
    if (!baseSha) return { ok: false, error: "base sha が取得できません" };

    // 新ブランチ作成（既存なら続行）
    const created = await api(ctx, "POST", `${repoPath(ctx.repo)}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
    if (!created.ok && created.status !== 422) {
      return { ok: false, error: `ブランチ作成失敗 (HTTP ${created.status})` };
    }

    // 各ファイルを branch 上で作成/更新（PUT contents）
    for (const f of input.files) {
      const cur = await api(
        ctx,
        "GET",
        `${repoPath(ctx.repo)}/contents/${encodeURIComponent(f.path).replace(/%2F/g, "/")}?ref=${branch}`,
      );
      const sha =
        cur.ok && cur.json && typeof cur.json === "object"
          ? (cur.json as { sha?: string }).sha
          : undefined;
      const put = await api(
        ctx,
        "PUT",
        `${repoPath(ctx.repo)}/contents/${encodeURIComponent(f.path).replace(/%2F/g, "/")}`,
        {
          message: `incident: ${input.title} (${f.path})`,
          content: toBase64(f.content),
          branch,
          ...(sha ? { sha } : {}),
        },
      );
      if (!put.ok) {
        return { ok: false, error: `ファイル更新失敗 ${f.path} (HTTP ${put.status})` };
      }
    }

    // PR 作成
    const pr = await api(ctx, "POST", `${repoPath(ctx.repo)}/pulls`, {
      title: input.title,
      head: branch,
      base,
      body: input.body,
    });
    if (!pr.ok) {
      return { ok: false, error: `PR 作成失敗 (HTTP ${pr.status})` };
    }
    const prJson = pr.json as { html_url?: string; number?: number };
    if (!prJson.html_url || !prJson.number) {
      return { ok: false, error: "PR 応答が不正" };
    }
    return {
      ok: true,
      pr: { url: prJson.html_url, number: prJson.number, branch },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * incident エージェント用の GitHub ツール群を生成する。
 * state.lastPr に作成した PR を記録し、index.ts がレポートに反映する。
 */
export function createGithubTools(
  repo: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): { tools: ReturnType<typeof tool>[]; state: GithubState } {
  const ctx: ApiCtx = { repo: parseRepo(repo), token, fetchImpl };
  const state: GithubState = {};

  const readFile = tool({
    name: "read_repo_file",
    description:
      "リポジトリのファイル内容を取得する。根本原因の特定や修正前の現状把握に使う。",
    inputSchema: z.object({
      path: z.string().describe("リポジトリ相対パス（例: agents/chat/src/handler.ts）"),
      ref: z.string().optional().describe("ブランチ/タグ/SHA（省略時は既定ブランチ）"),
    }),
    callback: async (input) => {
      const q = input.ref ? `?ref=${encodeURIComponent(input.ref)}` : "";
      const r = await api(
        ctx,
        "GET",
        `${repoPath(ctx.repo)}/contents/${encodeURIComponent(input.path).replace(/%2F/g, "/")}${q}`,
      );
      if (!r.ok) {
        return JSON.stringify({ ok: false, status: r.status });
      }
      const j = r.json as { content?: string; encoding?: string; sha?: string };
      const text =
        j.content && j.encoding === "base64"
          ? Buffer.from(j.content, "base64").toString("utf8")
          : "";
      // 過大なファイルは先頭のみ
      return JSON.stringify({
        ok: true,
        path: input.path,
        sha: j.sha,
        truncated: text.length > 16000,
        content: text.slice(0, 16000),
      });
    },
  });

  const searchCode = tool({
    name: "search_repo_code",
    description:
      "リポジトリ内のコードを検索し、該当ファイルパスを返す。エラーメッセージや関数名から原因箇所を探すのに使う。",
    inputSchema: z.object({
      query: z.string().describe("検索語（例: TypeError, parseAlarmEvent など）"),
    }),
    callback: async (input) => {
      const q = encodeURIComponent(
        `${input.query} repo:${ctx.repo.owner}/${ctx.repo.name}`,
      );
      const r = await api(ctx, "GET", `/search/code?q=${q}&per_page=10`);
      if (!r.ok) {
        return JSON.stringify({ ok: false, status: r.status });
      }
      const items = (r.json as { items?: { path?: string }[] }).items ?? [];
      return JSON.stringify({
        ok: true,
        paths: items.map((i) => i.path).filter(Boolean),
      });
    },
  });

  const openPr = tool({
    name: "open_fix_pr",
    description:
      "修正を新しいブランチに載せて Pull Request を作成する。各ファイルは修正後の『全文』を渡す（部分差分ではない）。本文には原因・修正・(あれば)再現結果・ロールバック観点を書く。承認はレビュー/マージで行われる。",
    inputSchema: z.object({
      title: z.string().describe("PR タイトル（簡潔に）"),
      body: z.string().describe("PR 本文（原因/修正/再現/ロールバック観点）"),
      branch: z.string().describe("作成ブランチ名（例: incident/fix-xxx）"),
      files: z
        .array(
          z.object({
            path: z.string(),
            content: z.string().describe("修正後のファイル全文"),
          }),
        )
        .min(1),
    }),
    callback: async (input) => {
      const result = await openFixPr(ctx, input);
      if (result.ok) {
        state.lastPr = result.pr;
        return JSON.stringify({ ok: true, prUrl: result.pr.url, number: result.pr.number });
      }
      return JSON.stringify({ ok: false, error: result.error });
    },
  });

  return { tools: [readFile, searchCode, openPr], state };
}
