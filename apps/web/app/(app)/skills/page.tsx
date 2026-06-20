"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatJst } from "@evo/shared";
import { parseFrontmatter } from "@/lib/frontmatter";

/** react-markdown のカスタムレンダラ（テーブルをラップ、リンクを新規タブに）。 */
const mdComponents = {
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="report-table">
      <table {...props} />
    </div>
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

type SkillTier = "base" | "dynamic";
type SkillSummary = {
  key: string;
  namespace: string;
  tier: SkillTier;
  skill: string;
  updatedAt: string;
};

const TIER_LABEL: Record<SkillTier, string> = {
  base: "base",
  dynamic: "dynamic",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch("/api/skills", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`一覧の取得に失敗しました (HTTP ${res.status})`);
      }
      const d = (await res.json()) as { skills?: SkillSummary[] };
      setSkills(d.skills ?? []);
    } catch (e) {
      setSkills([]);
      setListError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // namespace ごとにグルーピング（表示順は API 側で整列済み）。
  const groups = useMemo(() => {
    const m = new Map<string, SkillSummary[]>();
    for (const s of skills) {
      const arr = m.get(s.namespace) ?? [];
      arr.push(s);
      m.set(s.namespace, arr);
    }
    return [...m.entries()];
  }, [skills]);

  useEffect(() => {
    if (selected === null && skills.length > 0) {
      setSelected(skills[0]?.key ?? null);
    }
  }, [skills, selected]);

  const loadDoc = useCallback((key: string) => {
    setLoadingDoc(true);
    fetch(`/api/skills/content?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { markdown: "" }))
      .then((d: { markdown?: string }) => setMarkdown(d.markdown ?? ""))
      .catch(() => setMarkdown(""))
      .finally(() => setLoadingDoc(false));
  }, []);

  useEffect(() => {
    if (selected) loadDoc(selected);
    else setMarkdown("");
  }, [selected, loadDoc]);

  const current = skills.find((s) => s.key === selected) ?? null;
  // frontmatter（name/description）を分離し、本文だけを Markdown 描画する。
  const { attributes, body } = useMemo(
    () => parseFrontmatter(markdown),
    [markdown],
  );

  // 表示中の SKILL.md を原文（frontmatter 込み）でダウンロードする。
  const downloadCurrent = useCallback(() => {
    if (!current || !markdown) return;
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.namespace}-${current.tier}-${current.skill}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [current, markdown]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <h1 className="text-sm font-semibold">Skills</h1>
        <p className="text-xs text-muted">
          エージェントの作業手順（read-only）
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 左: skill 一覧（namespace ごと） */}
        <nav className="w-64 shrink-0 overflow-y-auto border-r border-border p-3">
          {loadingList ? (
            <p className="px-2 py-2 text-xs text-muted">読み込み中…</p>
          ) : listError ? (
            <p className="px-2 py-2 text-xs text-danger">{listError}</p>
          ) : skills.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">skill がありません</p>
          ) : (
            groups.map(([ns, items]) => (
              <div key={ns} className="mb-4">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {ns}
                </p>
                <ul className="space-y-0.5">
                  {items.map((s) => {
                    const active = s.key === selected;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          onClick={() => setSelected(s.key)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? "bg-surface-2 text-fg"
                              : "text-muted hover:bg-surface-2 hover:text-fg"
                          }`}
                          title={s.key}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {s.skill}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              s.tier === "dynamic"
                                ? "bg-accent/15 text-accent"
                                : "bg-surface-2 text-muted"
                            }`}
                          >
                            {TIER_LABEL[s.tier]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        {/* 右: SKILL.md 表示 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-5 py-6">
            {current && (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                <span className="rounded bg-surface-2 px-2 py-0.5">
                  {current.namespace}
                </span>
                <span>/</span>
                <span
                  className={`rounded px-2 py-0.5 ${
                    current.tier === "dynamic"
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-2"
                  }`}
                >
                  {current.tier}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  {current.updatedAt && (
                    <span>{formatJst(current.updatedAt)}</span>
                  )}
                  <button
                    type="button"
                    onClick={downloadCurrent}
                    disabled={loadingDoc || markdown.length === 0}
                    className="rounded-lg border border-border px-2.5 py-1 font-medium text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                    title="この SKILL.md をダウンロード"
                  >
                    ⬇ ダウンロード
                  </button>
                </div>
              </div>
            )}
            {loadingList ? (
              <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
            ) : skills.length === 0 ? (
              <div className="grid place-items-center py-24 text-center">
                <p className="text-lg font-medium">skill がまだありません</p>
                <p className="mt-1 text-sm text-muted">
                  デプロイで base skill が seed され、エージェントが dynamic skill
                  を生成すると表示されます。
                </p>
              </div>
            ) : loadingDoc ? (
              <p className="py-10 text-center text-sm text-muted">
                読み込み中…
              </p>
            ) : (
              <article className="report-card report-md">
                {(attributes.name || attributes.description) && (
                  <div className="skill-frontmatter">
                    {attributes.name && (
                      <h1 className="skill-name">{attributes.name}</h1>
                    )}
                    {attributes.description && (
                      <p className="skill-description">
                        {attributes.description}
                      </p>
                    )}
                  </div>
                )}
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {body}
                </Markdown>
              </article>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
