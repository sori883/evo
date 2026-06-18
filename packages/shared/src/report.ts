/**
 * 運用レポートの「会話由来の改善 overlay」を DynamoDB 共有テーブルに積むための
 * キー規約。chat（書き込み）と report（読み込み）の双方が参照する。
 *   PK = SYSTEM#report / SK = OVERLAY#<timestamp>
 */
export const OVERLAY_PK = "SYSTEM#report";
export const OVERLAY_SK_PREFIX = "OVERLAY#";

export type OverlayItem = {
  PK: string;
  SK: string;
  instruction: string;
  createdAt: string;
};

/** overlay アイテム（追加指示）を組み立てる。 */
export function buildOverlayItem(instruction: string, createdAt: string): OverlayItem {
  return {
    PK: OVERLAY_PK,
    SK: `${OVERLAY_SK_PREFIX}${createdAt}`,
    instruction: instruction.trim(),
    createdAt,
  };
}
