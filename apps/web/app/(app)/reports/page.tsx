"use client";

import { useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";

type ReportSummary = { name: string; label: string; updatedAt: string };

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d: { reports?: ReportSummary[] }) => {
        const list = d.reports ?? [];
        setReports(list);
        setSelected(list[0]?.name ?? null);
      })
      .catch(() => setReports([]))
      .finally(() => setLoadingList(false));
  }, []);

  const load = useCallback((name: string) => {
    setLoadingDoc(true);
    fetch(`/api/reports/${encodeURIComponent(name)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { markdown: "" }))
      .then((d: { markdown?: string }) => setMarkdown(d.markdown ?? ""))
      .catch(() => setMarkdown(""))
      .finally(() => setLoadingDoc(false));
  }, []);

  useEffect(() => {
    if (selected) load(selected);
  }, [selected, load]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <h1 className="text-sm font-semibold">運用レポート</h1>
        {reports.length > 0 && (
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
            className="max-w-[60%] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {reports.map((r) => (
              <option key={r.name} value={r.name}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          {loadingList ? (
            <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
          ) : reports.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">まだレポートがありません</p>
              <p className="mt-1 text-sm text-muted">
                レポートエージェントが生成するとここに表示されます。
              </p>
            </div>
          ) : loadingDoc ? (
            <p className="py-10 text-center text-sm text-muted">レポートを読み込み中…</p>
          ) : (
            <article className="report-md">
              <Markdown>{markdown}</Markdown>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
