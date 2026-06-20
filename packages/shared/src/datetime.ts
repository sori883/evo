/**
 * 日時表示ユーティリティ。本プロジェクトの表示は **JST（Asia/Tokyo）に統一**する。
 * 依存なし（Intl 組み込み）。保存・キーは UTC のまま、表示時にのみ JST へ変換する。
 */

/**
 * ISO 文字列（UTC 等）を JST の "YYYY-MM-DD HH:mm:ss JST" に整形する。
 * 不正な入力は空文字を返す。
 */
export function formatJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  // sv-SE ロケールは "YYYY-MM-DD HH:mm:ss" 形式を返す。timeZone で JST に変換。
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${s} JST`;
}

/** 秒を省いた "YYYY-MM-DD HH:mm JST"。一覧表示など用。 */
export function formatJstMinutes(iso: string): string {
  const full = formatJst(iso);
  if (!full) return "";
  // "YYYY-MM-DD HH:mm:ss JST" → 秒を落とす
  return full.replace(/:\d{2} JST$/, " JST");
}
