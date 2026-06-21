import { describe, expect, it } from "vitest";
import { resourceTypeFromArn } from "./collect.js";

describe("resourceTypeFromArn", () => {
  it("service:resourceType を取り出す", () => {
    expect(
      resourceTypeFromArn(
        "arn:aws:dynamodb:ap-northeast-1:123:table/EvoStack-SharedData",
      ),
    ).toBe("dynamodb:table");
    expect(
      resourceTypeFromArn(
        "arn:aws:bedrock-agentcore:ap-northeast-1:123:runtime/evo_chat-XXXX",
      ),
    ).toBe("bedrock-agentcore:runtime");
  });

  it("resourceType が無ければ service のみ", () => {
    expect(resourceTypeFromArn("arn:aws:s3:::my-bucket")).toBe("s3");
  });
});
