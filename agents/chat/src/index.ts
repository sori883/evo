import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { invokeRequestSchema, type AgentStreamEvent } from "@evo/shared";
import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import { createAgent } from "./agent.js";
import { createVerifier, verifyAndGetSub } from "./auth.js";
import { loadEnv } from "./env.js";
import { MemoryStore } from "./memory.js";
import { toAgentStreamEvent } from "./sse.js";

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
    // requestSchema は使わず手動 parse する（SDK が zod v4 型を要求するため、
    // zod v3 の @evo/shared スキーマと型が衝突するのを避ける）。
    process: async function* (request, context) {
      const input = invokeRequestSchema.parse(request);

      // 1. JWT を検証し actorId(= Cognito sub) を得る
      const actorId = await verifyAndGetSub(verifier, context.headers);

      // 2. 関連記憶を取得して systemPrompt に注入
      const memoryContext = await memory.retrieve(actorId, input.prompt);
      const agent = createAgent(env, memoryContext);

      // 3. ストリーミング応答を SSE として流す
      let assistant = "";
      for await (const streamEvent of agent.stream(input.prompt)) {
        const out = toAgentStreamEvent(streamEvent);
        if (out) {
          assistant += out.text;
          yield { event: "message", data: out };
        }
      }

      // 4. 会話を記憶に保存して完了通知
      await memory.save(actorId, input.sessionId, input.prompt, assistant);
      const done: AgentStreamEvent = {
        type: "done",
        sessionId: input.sessionId,
      };
      yield { event: "done", data: done };
    },
  },
});

app.run();
