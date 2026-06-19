/**
 * 共有 skill ストアの純ロジックとストレージ抽象。
 *
 * skill は S3 上で **エージェント別 namespace** に置き、アクセス制御する:
 *   skills/<agent>/<tier>/<skill>/SKILL.md   (tier = base | dynamic)
 *
 * - base    : リポジトリが source。deploy 時に seed（読み取り専用運用）。
 * - dynamic : エージェントが実行時に自己改善で生成/更新（追記のみ）。
 *
 * アクセスモデル:
 * - 対話エージェント(chat)=ハブ。全 namespace を読める。
 * - 非 chat エージェントは自分の namespace のみ読める。
 * - 書込は必ず自分の dynamic namespace のみ（base は構造的に書けない）。
 *
 * このモジュールは aws-sdk / node:fs に依存しない。S3 や fs は呼び出し側が
 * {@link SkillStorage} と writeFile コールバックとして注入する（テスト容易性）。
 */

/** S3 上の skill ルート prefix。 */
export const SKILLS_ROOT = "skills";

/** 全 namespace を読めるハブエージェント（対話エージェント）。 */
export const HUB_AGENT = "chat";

/** skill の段階。base=リポジトリ由来 / dynamic=実行時生成。 */
export type SkillTier = "base" | "dynamic";

const TIERS: SkillTier[] = ["base", "dynamic"];

/**
 * namespace / skill セグメントの許容パターン（kebab-case, 1..64 文字）。
 * `.` や `..`、スラッシュを排除しパストラバーサルを防ぐ。
 */
const SEGMENT_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** skill 名の許容パターン（namespace/skill 共通）。 */
const SKILL_NAME_RE = SEGMENT_RE;

/** dynamic skill の最大バイト数（既定）。 */
export const DEFAULT_MAX_SKILL_BYTES = 64 * 1024;

/** S3 キーを解析した結果。 */
export interface ParsedSkillKey {
  namespace: string;
  tier: SkillTier;
  skill: string;
}

/**
 * skill ストアの I/O 抽象。S3 実装は各エージェント側アダプタで注入する。
 */
export interface SkillStorage {
  /** `skills/` 直下の namespace（=エージェント名）一覧。 */
  listNamespaces(): Promise<string[]>;
  /** `skills/<namespace>/` 配下の SKILL.md キー一覧。 */
  listKeys(namespace: string): Promise<string[]>;
  /** 指定キーの本文を取得する。 */
  get(key: string): Promise<string>;
  /** 指定キーへ本文を書き込む。 */
  put(key: string, body: string): Promise<void>;
}

/**
 * エージェントが読める namespace を返す。
 * ハブ(chat)は与えられた全 namespace（重複排除・順序保持）、
 * 非ハブは自分の namespace のみ。
 */
export function readableNamespaces(
  agent: string,
  allNamespaces: string[],
): string[] {
  if (agent !== HUB_AGENT) {
    return [agent];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ns of allNamespaces) {
    if (!seen.has(ns)) {
      seen.add(ns);
      out.push(ns);
    }
  }
  return out;
}

/** `skills/<namespace>/` を返す。 */
export function namespacePrefix(namespace: string): string {
  return `${SKILLS_ROOT}/${namespace}/`;
}

/**
 * S3 キーを解析する。`skills/<ns>/<tier>/<skill>/SKILL.md` 以外は null。
 */
export function parseSkillKey(key: string): ParsedSkillKey | null {
  const parts = key.split("/");
  if (parts.length !== 5) return null;
  const [root, namespace, tier, skill, file] = parts;
  if (root !== SKILLS_ROOT) return null;
  if (file !== "SKILL.md") return null;
  if (!TIERS.includes(tier as SkillTier)) return null;
  // namespace / skill は安全セグメントのみ（".." 等のパストラバーサルを排除）。
  if (!namespace || !SEGMENT_RE.test(namespace)) return null;
  if (!skill || !SEGMENT_RE.test(skill)) return null;
  return { namespace, tier: tier as SkillTier, skill };
}

/**
 * S3 キーをローカルの SKILL.md パスへ写像する。
 * tier も含めて namespace/tier/skill のディレクトリに分け、base/dynamic の
 * 同名 skill が衝突しないようにする。
 */
export function localSkillFile(destRoot: string, key: string): string {
  const parsed = parseSkillKey(key);
  if (!parsed) {
    throw new Error(`不正な skill キー: ${key}`);
  }
  return `${destRoot}/${parsed.namespace}/${parsed.tier}/${parsed.skill}/SKILL.md`;
}

/**
 * エージェントが読むべき SKILL.md キーを集める。
 * 非ハブは自分の namespace のみ listKeys する（他 namespace は呼ばない）。
 */
export async function resolveSkillKeys(
  storage: Pick<SkillStorage, "listNamespaces" | "listKeys">,
  agent: string,
): Promise<string[]> {
  const all =
    agent === HUB_AGENT ? await storage.listNamespaces() : [agent];
  const namespaces = readableNamespaces(agent, all);
  const lists = await Promise.all(namespaces.map((ns) => storage.listKeys(ns)));
  return lists.flat();
}

/**
 * 各キーを取得してローカルへ materialize し、一意な skill ディレクトリ群
 * （= AgentSkills に渡すパス）を返す。不正キーは無視する。
 */
export async function materializeSkills(
  storage: Pick<SkillStorage, "get">,
  destRoot: string,
  keys: string[],
  writeFile: (absPath: string, content: string) => Promise<void>,
): Promise<string[]> {
  const dirs = new Set<string>();
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (!parseSkillKey(key)) continue;
    const content = await storage.get(key);
    const file = localSkillFile(destRoot, key);
    await writeFile(file, content);
    dirs.add(file.slice(0, file.length - "/SKILL.md".length));
  }
  return [...dirs];
}

/** skill 名を検証する（不正なら throw）。 */
export function assertValidSkillName(skill: string): void {
  if (!SKILL_NAME_RE.test(skill)) {
    throw new Error(
      `不正な skill 名: ${JSON.stringify(skill)}（kebab-case 1..64 文字のみ）`,
    );
  }
}

/**
 * dynamic skill の本文を検証する（不正なら throw）。
 * - frontmatter に name と description が必須
 * - サイズ上限内
 */
export function assertValidSkillContent(
  content: string,
  maxBytes: number = DEFAULT_MAX_SKILL_BYTES,
): void {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes > maxBytes) {
    throw new Error(`skill 本文が大きすぎます: ${bytes} > ${maxBytes} bytes`);
  }
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    throw new Error("skill 本文に frontmatter(--- ... ---) がありません");
  }
  const front = m[1] ?? "";
  const hasName = /^name:\s*\S+/m.test(front);
  const hasDesc = /^description:\s*\S+/m.test(front);
  if (!hasName || !hasDesc) {
    throw new Error("frontmatter に name と description が必要です");
  }
}

/**
 * 自分の dynamic namespace を指す書込キーを作る。
 * tier は常に dynamic、namespace は常に自分自身（agent）。
 * これにより base や他 namespace へは構造的に書けない。
 */
export function buildDynamicSkillKey(agent: string, skill: string): string {
  assertValidSkillName(skill);
  return `${SKILLS_ROOT}/${agent}/dynamic/${skill}/SKILL.md`;
}

/**
 * キーが当該エージェントにとって書込可能か（自分の dynamic のみ true）。
 * IAM とは別の、アプリ層の防御チェック。
 */
export function isWritableByAgent(agent: string, key: string): boolean {
  const parsed = parseSkillKey(key);
  return (
    parsed !== null && parsed.namespace === agent && parsed.tier === "dynamic"
  );
}
