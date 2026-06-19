import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { createS3SkillStorage } from "./skill-sync.js";

describe("createS3SkillStorage", () => {
  it("listNamespaces は CommonPrefixes から namespace 名を抽出する", async () => {
    const send = vi.fn(async (_cmd: unknown) => ({
      CommonPrefixes: [
        { Prefix: "skills/chat/" },
        { Prefix: "skills/report/" },
      ],
    }));
    const storage = createS3SkillStorage({ send } as never, "bkt");
    expect(await storage.listNamespaces()).toEqual(["chat", "report"]);
    const cmd = send.mock.calls[0]?.[0];
    expect(cmd).toBeInstanceOf(ListObjectsV2Command);
    expect((cmd as ListObjectsV2Command).input).toMatchObject({
      Bucket: "bkt",
      Prefix: "skills/",
      Delimiter: "/",
    });
  });

  it("listKeys は SKILL.md のみ返しページングする", async () => {
    const send = vi
      .fn<(cmd: unknown) => Promise<Record<string, unknown>>>()
      .mockResolvedValueOnce({
        Contents: [
          { Key: "skills/report/base/a/SKILL.md" },
          { Key: "skills/report/base/a/other.txt" },
        ],
        IsTruncated: true,
        NextContinuationToken: "t1",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "skills/report/dynamic/b/SKILL.md" }],
        IsTruncated: false,
      });
    const storage = createS3SkillStorage({ send } as never, "bkt");
    expect(await storage.listKeys("report")).toEqual([
      "skills/report/base/a/SKILL.md",
      "skills/report/dynamic/b/SKILL.md",
    ]);
    expect(send).toHaveBeenCalledTimes(2);
    expect((send.mock.calls[1]?.[0] as ListObjectsV2Command).input).toMatchObject(
      { ContinuationToken: "t1" },
    );
  });

  it("get は Body をテキスト化する", async () => {
    const send = vi.fn(async (_cmd: unknown) => ({
      Body: { transformToString: async () => "hello" },
    }));
    const storage = createS3SkillStorage({ send } as never, "bkt");
    expect(await storage.get("skills/report/base/a/SKILL.md")).toBe("hello");
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
  });

  it("put は markdown を PutObject する", async () => {
    const send = vi.fn(async (_cmd: unknown) => ({}));
    const storage = createS3SkillStorage({ send } as never, "bkt");
    await storage.put("skills/report/dynamic/x/SKILL.md", "body");
    const cmd = send.mock.calls[0]?.[0];
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect((cmd as PutObjectCommand).input).toMatchObject({
      Bucket: "bkt",
      Key: "skills/report/dynamic/x/SKILL.md",
      ContentType: "text/markdown; charset=utf-8",
    });
  });
});
