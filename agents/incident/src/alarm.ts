/**
 * アラーム起動ペイロードの解釈（純ロジック）。
 * EventBridge の "CloudWatch Alarm State Change" イベント、または手動 invoke の
 * 簡易ペイロードのどちらも受け付け、正規化した {@link AlarmContext} を返す。
 */

export interface AlarmContext {
  alarmName: string;
  /** ALARM / OK / INSUFFICIENT_DATA。 */
  stateValue: string;
  previousState?: string;
  reason?: string;
  metricName?: string;
  namespace?: string;
  /** 状態遷移時刻（ISO, UTC）。 */
  timestamp?: string;
  region?: string;
  accountId?: string;
  /** 関連リソース ARN（あれば）。 */
  resources?: string[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * 起動ペイロードを AlarmContext に正規化する。
 * detail 構造（EventBridge）を優先し、無ければフラットなフィールドを見る。
 */
export function parseAlarmEvent(request: unknown): AlarmContext {
  const root = asRecord(request);
  const detail = asRecord(root.detail);

  // CloudWatch Alarm State Change イベント
  const state = asRecord(detail.state);
  const prev = asRecord(detail.previousState);
  const config = asRecord(detail.configuration);
  const metrics = Array.isArray(config.metrics) ? config.metrics : [];
  const firstMetric = asRecord(asRecord(metrics[0]).metricStat);
  const metric = asRecord(firstMetric.metric);

  const alarmName =
    asString(detail.alarmName) ??
    asString(root.alarmName) ??
    asString(root.AlarmName) ??
    "unknown-alarm";

  const stateValue =
    asString(state.value) ??
    asString(root.stateValue) ??
    asString(root.NewStateValue) ??
    "ALARM";

  const resources = Array.isArray(root.resources)
    ? root.resources.filter((r): r is string => typeof r === "string")
    : undefined;

  return {
    alarmName,
    stateValue,
    previousState: asString(prev.value) ?? asString(root.previousState),
    reason:
      asString(state.reason) ??
      asString(root.reason) ??
      asString(root.NewStateReason),
    metricName: asString(metric.name) ?? asString(root.metricName),
    namespace: asString(metric.namespace) ?? asString(root.namespace),
    timestamp:
      asString(state.timestamp) ??
      asString(root.time) ??
      asString(root.timestamp),
    region: asString(root.region),
    accountId: asString(root.account) ?? asString(root.accountId),
    resources,
  };
}

/** 対象が「対応を検討すべき」状態か（ALARM のみ対象）。 */
export function isActionableState(alarm: AlarmContext): boolean {
  return alarm.stateValue === "ALARM";
}
