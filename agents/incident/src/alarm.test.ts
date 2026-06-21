import { describe, expect, it } from "vitest";
import { isActionableState, parseAlarmEvent } from "./alarm.js";

const cwEvent = {
  "detail-type": "CloudWatch Alarm State Change",
  source: "aws.cloudwatch",
  account: "242201303782",
  time: "2026-06-21T02:00:00Z",
  region: "ap-northeast-1",
  resources: ["arn:aws:cloudwatch:ap-northeast-1:242201303782:alarm:evo-chat-errors"],
  detail: {
    alarmName: "evo-chat-errors",
    state: { value: "ALARM", reason: "Threshold Crossed: 3 errors", timestamp: "2026-06-21T02:00:00Z" },
    previousState: { value: "OK" },
    configuration: {
      metrics: [
        {
          id: "m1",
          metricStat: {
            metric: { namespace: "AWS/Lambda", name: "Errors", dimensions: {} },
          },
        },
      ],
    },
  },
};

describe("parseAlarmEvent", () => {
  it("EventBridge の CloudWatch アラームイベントを正規化する", () => {
    const a = parseAlarmEvent(cwEvent);
    expect(a).toMatchObject({
      alarmName: "evo-chat-errors",
      stateValue: "ALARM",
      previousState: "OK",
      reason: "Threshold Crossed: 3 errors",
      metricName: "Errors",
      namespace: "AWS/Lambda",
      timestamp: "2026-06-21T02:00:00Z",
      region: "ap-northeast-1",
      accountId: "242201303782",
    });
    expect(a.resources?.[0]).toContain("alarm:evo-chat-errors");
  });

  it("簡易フラットペイロードも受け付ける", () => {
    const a = parseAlarmEvent({
      alarmName: "x",
      stateValue: "ALARM",
      metricName: "Throttles",
      namespace: "AWS/Lambda",
      reason: "manual",
    });
    expect(a).toMatchObject({
      alarmName: "x",
      stateValue: "ALARM",
      metricName: "Throttles",
      reason: "manual",
    });
  });

  it("欠損時は既定値（alarmName=unknown-alarm, state=ALARM）", () => {
    const a = parseAlarmEvent({});
    expect(a.alarmName).toBe("unknown-alarm");
    expect(a.stateValue).toBe("ALARM");
  });
});

describe("isActionableState", () => {
  it("ALARM のみ true", () => {
    expect(isActionableState(parseAlarmEvent(cwEvent))).toBe(true);
    expect(
      isActionableState(parseAlarmEvent({ alarmName: "x", stateValue: "OK" })),
    ).toBe(false);
  });
});
