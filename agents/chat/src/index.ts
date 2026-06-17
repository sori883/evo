import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { invokeRequestSchema } from "@evo/shared";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { createAgent } from "./agent.js";
import { createVerifier, verifyAndGetSub } from "./auth.js";
import { loadEnv } from "./env.js";
import { runChat } from "./handler.js";
import { MemoryStore } from "./memory.js";

const env = loadEnv();
const memory = new MemoryStore(
  new BedrockAgentCoreClient({ region: env.AWS_REGION }),
  env.MEMORY_ID,
);
const verifier = createVerifier({
  userPoolId: env.COGNITO_USER_POOL_ID,
  clientId: env.COGNITO_CLIENT_ID,
});

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
            createAgent(env, memoryContext).stream(prompt),
          save: (actorId, sessionId, user, assistant) =>
            memory.save(actorId, sessionId, user, assistant),
        },
        invokeRequestSchema.parse(request),
        context.headers,
      ),
  },
});

app.run();
