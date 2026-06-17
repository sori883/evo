import type { NextRequest } from "next/server";
import { invokeRequestSchema } from "@evo/shared";
import { isSameOrigin } from "@/lib/csrf";
import { serverEnv } from "@/lib/env";
import { getValidAccessToken } from "@/lib/session";

/**
 * BFF: cookie の access token を Bearer に載せ替えて AgentCore Runtime を
 * HTTPS で直叩きし、SSE をそのままクライアントへ pass-through する。
 */
export async function POST(req: NextRequest): Promise<Response> {
  // CSRF: 同一オリジンからの呼び出しのみ許可する。
  if (!isSameOrigin(req.headers)) {
    return new Response("Forbidden", { status: 403 });
  }

  // 失効/失効間近なら refresh token で再発行してから使う。
  const token = await getValidAccessToken(Date.now());
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = invokeRequestSchema.parse(await req.json());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const env = serverEnv();
  const upstream = await fetch(env.AGENT_RUNTIME_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("agent error", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
