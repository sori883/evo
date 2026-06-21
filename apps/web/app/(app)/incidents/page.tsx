"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type IncidentSummary = {
  name: string;
  label: string;
  alarmName: string;
  updatedAt: string;
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`一覧の取得に失敗しました (HTTP ${res.status})`);
      }
      const d = (await res.json()) as { incidents?: IncidentSummary[] };
      setIncidents(d.incidents ?? []);
    } catch (e) {
      setIncidents([]);
      setListError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setSelected((cur) => cur ?? incidents[0]?.name ?? null);
  }, [incidents]);

  const loadDoc = useCallback((name: string) => {
    setLoadingDoc(true);
    fetch(`/api/incidents/${encodeURIComponent(name)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { markdown: "" }))
      .then((d: { markdown?: string }) => setMarkdown(d.markdown ?? ""))
      .catch(() => setMarkdown(""))
      .finally(() => setLoadingDoc(false));
  }, []);

  useEffect(() => {
    if (selected) loadDoc(selected);
    else setMarkdown("");
  }, [selected, loadDoc]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">インシデント</h1>
          <p className="text-xs text-muted">アラート診断・対処（read-only）</p>
        </div>
        {incidents.length > 0 && (
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
            className="max-w-[60%] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {incidents.map((i) => (
              <option key={i.name} value={i.name}>
                {i.label}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          {loadingList ? (
            <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
          ) : listError ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">読み込みに失敗しました</p>
              <p className="mt-1 text-sm text-muted">{listError}</p>
              <p className="mt-1 text-xs text-muted">
                ローカルでは AWS 認証(SSO)の再ログインが必要かもしれません。
              </p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">まだインシデントはありません</p>
              <p className="mt-1 text-sm text-muted">
                CloudWatch アラームが発報すると、診断結果がここに表示されます。
              </p>
            </div>
          ) : loadingDoc ? (
            <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
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
