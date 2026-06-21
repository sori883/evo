import { S3Client } from "@aws-sdk/client-s3";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { parseAlarmEvent } from "./alarm.js";
import { createIncidentAgent } from "./agent.js";
import { loadEnv } from "./env.js";
import { createS3SkillStorage, syncSkills } from "./skill-sync.js";
import { saveIncident } from "./storage.js";
import {
  buildDiagnosisPrompt,
  renderIncidentMarkdown,
  triageSchema,
} from "./triage.js";

const env = loadEnv();
const s3 = new S3Client({ region: env.AWS_REGION });

// 起動時に共有 skill ストア(S3)から自分(incident)の skill を /tmp へ sync。
// 失敗しても skill 無しで継続。
const skillStorage = createS3SkillStorage(s3, env.SKILLS_BUCKET);
const skillDirs = await syncSkills(
  skillStorage,
  env.AGENT_ID,
  "/tmp/evo-skills",
).catch((e) => {
  console.error("skill sync に失敗（skill 無しで継続）:", e);
  return [] as string[];
});

/**
 * CloudWatch アラーム(EventBridge / SigV4)で invoke される診断ハンドラ。
 * アラーム解釈 → read-only 診断 → 対応要否判定 → incident レポート S3 保存。
 */
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (request) => {
      const alarm = parseAlarmEvent(request);

      const agent = createIncidentAgent(env, {
        skillDirs,
        storage: skillStorage,
      });
      const result = await agent.invoke(buildDiagnosisPrompt(alarm));
      const triage = triageSchema.parse(result.structuredOutput);

      const generatedAt = new Date().toISOString();
      const md = renderIncidentMarkdown(alarm, triage, {
        alarmName: alarm.alarmName,
        detectedAt: alarm.timestamp ?? generatedAt,
        generatedAt,
      });
      const saved = await saveIncident(
        s3,
        env.INCIDENTS_BUCKET,
        md,
        generatedAt,
        alarm.alarmName,
      );

      return {
        ok: true,
        alarmName: alarm.alarmName,
        needsAction: triage.needsAction,
        severity: triage.severity,
        key: saved.key,
      };
    },
  },
});

app.run();
