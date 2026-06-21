import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  Inspector2Client,
  ListFindingsCommand,
} from "@aws-sdk/client-inspector2";
import {
  GetResourcesCommand,
  ResourceGroupsTaggingAPIClient,
} from "@aws-sdk/client-resource-groups-tagging-api";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

/**
 * 収集ツールが必要とする最小の環境設定。各エージェントの env が
 * 構造的にこれを満たす（report/incident など）。
 */
export interface CollectEnv {
  AWS_REGION: string;
  TARGET_TAG_KEY: string;
  TARGET_TAG_VALUE: string;
}

/** ARN からサービス/リソース種別をざっくり取り出す（構成把握の手がかり）。 */
export function resourceTypeFromArn(arn: string): string {
  // arn:aws:<service>:<region>:<account>:<resourceType>/<id>（または :<id>）
  const parts = arn.split(":");
  const service = parts[2] ?? "";
  const resource = parts.slice(5).join(":");
  // "type/id" or "type:id" 形式なら type を採用。区切りが無ければ（S3 等）service のみ。
  const m = resource.match(/^([a-zA-Z0-9-]+)[/:]/);
  return m ? `${service}:${m[1]}` : service;
}

const json = (v: unknown): string => JSON.stringify(v, null, 2);
const errText = (e: unknown): string =>
  e instanceof Error ? `${e.name}: ${e.message}` : String(e);

/**
 * read-only な収集ツール群（Strands tool）。LLM が必要に応じて呼ぶ。
 * AWS リソースは一切変更しない。report / incident で共有する。
 */
export function createCollectionTools(env: CollectEnv) {
  const region = env.AWS_REGION;
  const tagging = new ResourceGroupsTaggingAPIClient({ region });
  const cw = new CloudWatchClient({ region });
  const logs = new CloudWatchLogsClient({ region });

  const listTaggedResources = tool({
    name: "list_tagged_resources",
    description:
      "監視対象タグの付いた AWS リソースの ARN・種別・タグを列挙する。構成把握の起点。",
    inputSchema: z.object({}),
    callback: async () => {
      try {
        const out: Array<{ arn: string; type: string; tags: Record<string, string> }> = [];
        let token: string | undefined;
        do {
          const res = await tagging.send(
            new GetResourcesCommand({
              TagFilters: [
                { Key: env.TARGET_TAG_KEY, Values: [env.TARGET_TAG_VALUE] },
              ],
              ResourcesPerPage: 100,
              PaginationToken: token,
            }),
          );
          for (const m of res.ResourceTagMappingList ?? []) {
            const arn = m.ResourceARN ?? "";
            out.push({
              arn,
              type: resourceTypeFromArn(arn),
              tags: Object.fromEntries(
                (m.Tags ?? []).map((t) => [t.Key ?? "", t.Value ?? ""]),
              ),
            });
          }
          token = res.PaginationToken || undefined;
        } while (token);
        return json({ count: out.length, resources: out });
      } catch (e) {
        return json({ error: errText(e) });
      }
    },
  });

  const describeAlarms = tool({
    name: "describe_alarms",
    description:
      "CloudWatch アラームの一覧と状態を取得する。state を指定すると絞り込む（ALARM 等）。",
    inputSchema: z.object({
      state: z.enum(["OK", "ALARM", "INSUFFICIENT_DATA"]).optional(),
    }),
    callback: async (input) => {
      try {
        const res = await cw.send(
          new DescribeAlarmsCommand({
            StateValue: input.state,
            MaxRecords: 100,
          }),
        );
        const alarms = (res.MetricAlarms ?? []).map((a) => ({
          name: a.AlarmName,
          state: a.StateValue,
          metric: a.MetricName,
          namespace: a.Namespace,
          reason: a.StateReason,
        }));
        return json({ count: alarms.length, alarms });
      } catch (e) {
        return json({ error: errText(e) });
      }
    },
  });

  const getMetrics = tool({
    name: "get_metrics",
    description:
      "CloudWatch メトリクスの直近の統計値を取得する。namespace/metricName/dimensions/stat と期間(分)を指定。",
    inputSchema: z.object({
      namespace: z.string(),
      metricName: z.string(),
      dimensions: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .optional(),
      stat: z.enum(["Average", "Sum", "Maximum", "Minimum", "p99"]).default("Average"),
      periodMinutes: z.number().int().positive().max(1440).default(60),
    }),
    callback: async (input) => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - input.periodMinutes * 60_000);
        const res = await cw.send(
          new GetMetricDataCommand({
            StartTime: start,
            EndTime: end,
            MetricDataQueries: [
              {
                Id: "m1",
                MetricStat: {
                  Metric: {
                    Namespace: input.namespace,
                    MetricName: input.metricName,
                    Dimensions: (input.dimensions ?? []).map((d) => ({
                      Name: d.name,
                      Value: d.value,
                    })),
                  },
                  Period: 300,
                  Stat: input.stat,
                },
              },
            ],
          }),
        );
        const r = res.MetricDataResults?.[0];
        return json({ label: r?.Label, timestamps: r?.Timestamps, values: r?.Values });
      } catch (e) {
        return json({ error: errText(e) });
      }
    },
  });

  const queryLogs = tool({
    name: "query_logs",
    description:
      "CloudWatch Logs Insights でロググループを検索する。直近の error/warn 傾向の把握に使う。",
    inputSchema: z.object({
      logGroupName: z.string(),
      query: z
        .string()
        .default(
          "fields @timestamp, @message | filter @message like /(?i)(error|exception|fail)/ | sort @timestamp desc | limit 20",
        ),
      periodMinutes: z.number().int().positive().max(1440).default(60),
    }),
    callback: async (input) => {
      try {
        const end = Math.floor(Date.now() / 1000);
        const startQ = await logs.send(
          new StartQueryCommand({
            logGroupName: input.logGroupName,
            startTime: end - input.periodMinutes * 60,
            endTime: end,
            queryString: input.query,
            limit: 50,
          }),
        );
        const queryId = startQ.queryId;
        // ポーリング（最大 ~15s）
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const res = await logs.send(new GetQueryResultsCommand({ queryId }));
          if (res.status === "Complete") {
            const rows = (res.results ?? []).map((row) =>
              Object.fromEntries((row ?? []).map((f) => [f.field ?? "", f.value ?? ""])),
            );
            return json({ status: res.status, count: rows.length, rows });
          }
          if (res.status === "Failed" || res.status === "Cancelled") {
            return json({ status: res.status });
          }
        }
        return json({ status: "Timeout（クエリ未完）" });
      } catch (e) {
        return json({ error: errText(e) });
      }
    },
  });

  const getVulnerabilities = tool({
    name: "get_vulnerabilities",
    description:
      "Inspector/Security Hub の脆弱性 findings を取得する。サービス未有効ならデータなしとして扱う。",
    inputSchema: z.object({}),
    callback: async () => {
      // Inspector2 を優先。未有効/権限無なら「データなし（要有効化）」を返す。
      try {
        const client = new Inspector2Client({ region });
        const res = await client.send(
          new ListFindingsCommand({ maxResults: 50 }),
        );
        const findings = (res.findings ?? []).map((f) => ({
          severity: f.severity,
          title: f.title,
          type: f.type,
          resource: f.resources?.[0]?.id,
        }));
        return json({ source: "inspector2", count: findings.length, findings });
      } catch (e) {
        const msg = errText(e);
        // AccessDenied / not enabled 等
        return json({
          source: "inspector2",
          available: false,
          note: "データなし（要有効化）",
          detail: msg,
        });
      }
    },
  });

  return [
    listTaggedResources,
    describeAlarms,
    getMetrics,
    queryLogs,
    getVulnerabilities,
  ];
}
