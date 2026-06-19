import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { S3Client } from "@aws-sdk/client-s3";
import { invokeRequestSchema } from "@evo/shared";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { createAgent } from "./agent.js";
import { createVerifier, verifyAndGetSub } from "./auth.js";
import { loadEnv } from "./env.js";
import { runChat } from "./handler.js";
import { MemoryStore } from "./memory.js";
import { createS3SkillStorage, syncSkills } from "./skill-sync.js";

const env = loadEnv();
const memory = new MemoryStore(
  new BedrockAgentCoreClient({ region: env.AWS_REGION }),
  env.MEMORY_ID,
);
const verifier = createVerifier({
  userPoolId: env.COGNITO_USER_POOL_ID,
  clientId: env.COGNITO_CLIENT_ID,
});

// 起動時に共有 skill ストア(S3)から skill を /tmp へ sync する。chat はハブの
// ため全 namespace（report 等）を読む。失敗しても skill 無しで継続。
const skillStorage = createS3SkillStorage(
  new S3Client({ region: env.AWS_REGION }),
  env.SKILLS_BUCKET,
);
const skillDirs = await syncSkills(skillStorage, env.AGENT_ID, "/tmp/evo-skills").catch(
  (e) => {
    console.error("skill sync に失敗（skill 無しで継続）:", e);
    return [] as string[];
  },
);

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    // requestSchema は使わず手動 parse する（SDK の型と @evo/shared スキーマの
    // 型が衝突するのを避けるため）。処理本体とエラー整形は runChat(handler.ts)。
    process: (request, context) =>
      runChat(
        {
          getActorId: (headers) => verifyAndGetSub(verifier, headers),
          retrieve: (actorId, prompt) => memory.retrieve(actorId, prompt),
          stream: (memoryContext, prompt) =>
            createAgent(env, memoryContext, {
              skillDirs,
              storage: skillStorage,
            }).stream(prompt),
          save: (actorId, sessionId, user, assistant) =>
            memory.save(actorId, sessionId, user, assistant),
        },
        invokeRequestSchema.parse(request),
        context.headers,
      ),
  },
});

app.run();
