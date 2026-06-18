"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";

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

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d: { reports?: ReportSummary[] }) => setReports(d.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoadingList(false));
  }, []);

  const ofKind = useMemo(
    () => reports.filter((r) => r.kind === kind),
    [reports, kind],
  );

  // 種別を切替えたら、その種別の先頭（最新）を選ぶ
  useEffect(() => {
    setSelected(ofKind[0]?.name ?? null);
  }, [ofKind]);

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
    else setMarkdown("");
  }, [selected, load]);

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
        {ofKind.length > 0 && (
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
            className="max-w-[45%] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {ofKind.map((r) => (
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
          ) : ofKind.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-medium">
                まだ{kind === "config" ? "構成" : "運用"}レポートがありません
              </p>
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
