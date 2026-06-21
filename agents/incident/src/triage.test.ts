import { describe, expect, it } from "vitest";
import type { AlarmContext } from "./alarm.js";
import {
  type Triage,
  actionLabel,
  buildDiagnosisPrompt,
  renderIncidentMarkdown,
} from "./triage.js";

const alarm: AlarmContext = {
  alarmName: "evo-chat-errors",
  stateValue: "ALARM",
  previousState: "OK",
  reason: "Threshold Crossed: 3 errors",
  metricName: "Errors",
  namespace: "AWS/Lambda",
  timestamp: "2026-06-21T02:00:00Z",
};

const triage: Triage = {
  needsAction: true,
  severity: "high",
  summary: "Lambda のエラー急増",
  evidence: "直近10分で Errors=3、ログに TypeError",
  rootCauseHypothesis: "null 参照",
  recommendation: "ハンドラの null ガードを追加",
  affectedResources: ["arn:aws:lambda:...:fn"],
};

describe("buildDiagnosisPrompt", () => {
  it("アラーム情報を含む診断プロンプトを組む", () => {
    const p = buildDiagnosisPrompt(alarm);
    expect(p).toContain("evo-chat-errors");
    expect(p).toContain("AWS/Lambda / Errors");
    expect(p).toContain("needsAction");
  });
});

describe("actionLabel", () => {
  it("needsAction で要対応/対応不要", () => {
    expect(actionLabel(triage)).toBe("要対応");
    expect(actionLabel({ ...triage, needsAction: false })).toBe("対応不要");
  });
});

describe("renderIncidentMarkdown", () => {
  const meta = {
    alarmName: "evo-chat-errors",
    detectedAt: "2026-06-21T02:00:00Z",
    generatedAt: "2026-06-21T02:01:30Z",
  };

  it("判定・章立て・JST 日時を含む", () => {
    const md = renderIncidentMarkdown(alarm, triage, meta);
    expect(md).toContain("# インシデント: evo-chat-errors");
    expect(md).toContain("**判定: 要対応**");
    expect(md).toContain("深刻度: high");
    // JST: 02:00 UTC → 11:00 JST
    expect(md).toContain("検知日時: 2026-06-21 11:00:00 JST");
    for (const h of ["## サマリ", "## アラーム", "## 観測した事実", "## 根本原因の仮説", "## 推奨対応", "## 影響リソース"]) {
      expect(md).toContain(h);
    }
    expect(md).toContain("- arn:aws:lambda:...:fn");
  });

  it("対応不要・影響リソース無しはプレースホルダ", () => {
    const md = renderIncidentMarkdown(
      alarm,
      { ...triage, needsAction: false, affectedResources: [] },
      meta,
    );
    expect(md).toContain("**判定: 対応不要**");
    expect(md).toContain("_（特定なし）_");
  });
});
