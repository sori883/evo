import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { OVERLAY_PK, OVERLAY_SK_PREFIX } from "@evo/shared";

type OverlayItemLike = { instruction?: unknown };

/** DynamoDB の overlay アイテム列から、有効な追加指示の文字列だけを抽出する。 */
export function extractInstructions(items: OverlayItemLike[]): string[] {
  return items
    .map((i) => i.instruction)
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

type SendableDocClient = Pick<DynamoDBDocumentClient, "send">;

/**
 * 会話由来の改善 overlay（追加指示）を DynamoDB から読む。
 * chat 側が `appendReportOverlay` で書き、report 側はここで読んで生成に合成する。
 */
export class OverlayReader {
  constructor(
    private readonly client: SendableDocClient,
    private readonly tableName: string,
  ) {}

  async list(): Promise<string[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": OVERLAY_PK,
          ":sk": OVERLAY_SK_PREFIX,
        },
      }),
    );
    return extractInstructions(res.Items ?? []);
  }
}
