import { describe, expect, it, vi } from "vitest";
import {
  type AlarmDeps,
  alarmNameOf,
  handleAlarm,
  sessionIdFor,
} from "../lib/lambda/alarm-invoker";

describe("alarmNameOf", () => {
  it("detail.alarmName を取り出す", () => {
    expect(alarmNameOf({ detail: { alarmName: "evo-x" } })).toBe("evo-x");
  });
  it("欠損は unknown-alarm", () => {
    expect(alarmNameOf({})).toBe("unknown-alarm");
    expect(alarmNameOf(null)).toBe("unknown-alarm");
  });
});

describe("sessionIdFor", () => {
  it("33-64 文字・安全文字のみ", () => {
    const s = sessionIdFor("evo errors!", 1000, "abc");
    expect(s.length).toBeGreaterThanOrEqual(33);
    expect(s.length).toBeLessThanOrEqual(64);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

function deps(over: Partial<AlarmDeps> = {}): AlarmDeps {
  return {
    agentRuntimeArn: "arn:incident",
    dedupTable: "Dedup",
    windowSec: 900,
    now: 1_700_000_000_000,
    rand: "r",
    ddbSend: vi.fn(async (_cmd: unknown) => ({})),
    agentSend: vi.fn(async (_cmd: unknown) => ({})),
    ...over,
  };
}

describe("handleAlarm dedup", () => {
  it("dedup 通過時は invoke する", async () => {
    const d = deps();
    const res = await handleAlarm(d, { detail: { alarmName: "evo-x" } });
    expect(res).toMatchObject({ ok: true, alarmName: "evo-x" });
    expect(res.skipped).toBeUndefined();
    expect(d.agentSend).toHaveBeenCalledTimes(1);
    // 条件付き Put が呼ばれている
    expect(d.ddbSend).toHaveBeenCalledTimes(1);
  });

  it("窓内重複(ConditionalCheckFailed)は skip し invoke しない", async () => {
    const err = Object.assign(new Error("cond"), {
      name: "ConditionalCheckFailedException",
    });
    const ddbSend = vi.fn(async () => {
      throw err;
    });
    const d = deps({ ddbSend });
    const res = await handleAlarm(d, { detail: { alarmName: "evo-x" } });
    expect(res).toMatchObject({ ok: true, skipped: true });
    expect(d.agentSend).not.toHaveBeenCalled();
  });

  it("dedupTable 未設定なら毎回 invoke する", async () => {
    const d = deps({ dedupTable: undefined });
    await handleAlarm(d, { detail: { alarmName: "evo-x" } });
    expect(d.ddbSend).not.toHaveBeenCalled();
    expect(d.agentSend).toHaveBeenCalledTimes(1);
  });

  it("ConditionalCheckFailed 以外の DDB エラーは伝播する", async () => {
    const ddbSend = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(
      handleAlarm(deps({ ddbSend }), { detail: { alarmName: "x" } }),
    ).rejects.toThrow("boom");
  });

  it("条件式は attribute_not_exists OR expiresAt < :now、TTL=now+window", async () => {
    const ddbSend = vi.fn(async (_cmd: unknown) => ({}));
    await handleAlarm(deps({ ddbSend, now: 2_000_000, windowSec: 600 }), {
      detail: { alarmName: "evo-x" },
    });
    const input = (ddbSend.mock.calls[0]?.[0] as { input: Record<string, unknown> })
      .input;
    expect(input.ConditionExpression).toBe(
      "attribute_not_exists(alarmName) OR expiresAt < :now",
    );
    // now=2_000_000ms → nowSec=2000, expiresAt=2600
    expect(input).toMatchObject({
      TableName: "Dedup",
      Item: { alarmName: { S: "evo-x" }, expiresAt: { N: "2600" } },
      ExpressionAttributeValues: { ":now": { N: "2000" } },
    });
  });
});
