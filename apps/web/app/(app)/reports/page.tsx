"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type ReportKind = "config" | "operations";
type ReportSummary = {
  name: string;
  kind: ReportKind;
  label: string;
  updatedAt: string;
};

const KINDS: { key: ReportKind; label: string }[] = [
  { key: "operations", label: "運用" },
  { key: "config", label: "構成" },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [kind, setKind] = useState<ReportKind>("operations");
  const [selected, setSelected] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`一覧の取得に失敗しました (HTTP ${res.status})`);
      }
      const d = (await res.json()) as { reports?: ReportSummary[] };
      setReports(d.reports ?? []);
    } catch (e) {
      setReports([]);
      setListError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const ofKind = useMemo(
    () => reports.filter((r) => r.kind === kind),
    [reports, kind],
  );

  useEffect(() => {
    setSelected(ofKind[0]?.name ?? null);
  }, [ofKind]);

  const loadDoc = useCallback((name: string) => {
    setLoadingDoc(true);
    fetch(`/api/reports/${encodeURIComponent(name)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { markdown: "" }))
      .then((d: { markdown?: string }) => setMarkdown(d.markdown ?? ""))
      .catch(() => setMarkdown(""))
      .finally(() => setLoadingDoc(false));
  }, []);

  useEffect(() => {
    if (selected) loadDoc(selected);
    else setMarkdown("");
  }, [selected, loadDoc]);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `生成に失敗しました (HTTP ${res.status})`);
      }
      await loadList();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">レポート</h1>
          <div className="flex rounded-lg border border-border p-0.5">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  kind === k.key
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ofKind.length > 0 && (
            <select
              value={selected ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="max-w-[40%] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              {ofKind.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            title={`${kind === "config" ? "構成" : "運用"}レポートを今すぐ生成します（30秒ほどかかります）`}
          >
            {generating
              ? "生成中…"
              : `${kind === "config" ? "構成" : "運用"}を今すぐ生成`}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          {genError && (
            <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {genError}
            </p>
          )}
          {loadingList || generating ? (
            <p className="py-10 text-center text-sm text-muted">
              {generating ? "レポートを生成中…（30秒ほど）" : "読み込み中…"}
            </p>
          ) : listError ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">読み込みに失敗しました</p>
              <p className="mt-1 text-sm text-muted">{listError}</p>
              <p className="mt-1 text-xs text-muted">
                ローカルでは AWS 認証(SSO)の再ログインが必要かもしれません。
              </p>
            </div>
          ) : ofKind.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">
                まだ{kind === "config" ? "構成" : "運用"}レポートがありません
              </p>
              <p className="mt-1 text-sm text-muted">
                「今すぐ生成」を押すか、スケジュール実行をお待ちください。
              </p>
            </div>
          ) : loadingDoc ? (
            <p className="py-10 text-center text-sm text-muted">レポートを読み込み中…</p>
          ) : (
            <article className="report-card report-md">
              <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {markdown}
              </Markdown>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
