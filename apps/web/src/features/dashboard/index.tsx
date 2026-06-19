import { useReport, useReportRealtime, useReports } from "@repo/client-core";
import type { Report, ReportResult, ReportStatus } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { ProfileDropdown } from "@/shared/components/profile-dropdown";
import { ThemeSwitch } from "@/shared/components/theme-switch";
import { apiClient } from "@/shared/lib/api-client";
import { realtimeService } from "@/shared/lib/supabase";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { TopicForm } from "./components/topic-form";

const listReports = () => apiClient.get<Report[]>("/reports");
const getReport = (id: string) => apiClient.get<Report>(`/reports/${id}`);
const deleteReport = (id: string) => apiClient.delete<void>(`/reports/${id}`);
const reportStatusMeta: Record<
  ReportStatus,
  { label: string; badgeClassName: string; pendingCopy?: string }
> = {
  queued: {
    label: "В очереди",
    badgeClassName: "border-slate-300 bg-slate-100 text-slate-700",
    pendingCopy: "Report is queued for research. Live status updates will appear here.",
  },
  thinking: {
    label: "Думает",
    badgeClassName: "border-amber-300 bg-amber-100 text-amber-700",
    pendingCopy: "The agents are analyzing sources now. Live status updates will appear here.",
  },
  done: {
    label: "Готово",
    badgeClassName: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  error: {
    label: "Ошибка",
    badgeClassName: "border-rose-300 bg-rose-100 text-rose-700",
  },
};

function renderStatusBadge(status: ReportStatus) {
  const meta = reportStatusMeta[status];
  return (
    <Badge variant="outline" className={meta.badgeClassName}>
      {meta.label}
    </Badge>
  );
}

function getSourceLabel(source: string) {
  try {
    return new URL(source).hostname.replace(/^www\./u, "");
  } catch {
    return source;
  }
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function getReportDuration(report: Pick<Report, "createdAt" | "updatedAt">) {
  const createdAt = Date.parse(report.createdAt);
  const updatedAt = Date.parse(report.updatedAt);

  if (Number.isNaN(createdAt) || Number.isNaN(updatedAt) || updatedAt < createdAt) {
    return null;
  }

  return formatDuration(updatedAt - createdAt);
}

interface ExpandableTextProps {
  id: string;
  text: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}

function ExpandableText({ id, text, expanded, onToggle }: ExpandableTextProps) {
  const shouldCollapse = text.trim().length > 220;

  return (
    <div className="space-y-2">
      <p
        className={
          expanded || !shouldCollapse
            ? "text-sm leading-6 text-foreground/90"
            : "line-clamp-4 text-sm leading-6 text-foreground/90"
        }
      >
        {text}
      </p>
      {shouldCollapse && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-[var(--brand)]"
          onClick={() => onToggle(id)}
        >
          {expanded ? "Свернуть" : "Открыть полностью"}
        </Button>
      )}
    </div>
  );
}

interface RenderMarketOptions {
  expandedItems: Record<string, boolean>;
  onToggle: (id: string) => void;
}

function renderMarket(
  items: ReportResult["global_market"] | ReportResult["ru_market"],
  { expandedItems, onToggle }: RenderMarketOptions,
) {
  if (items === null || items === undefined) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-5">
        <p className="text-sm text-muted-foreground">No validated findings yet.</p>
      </div>
    );
  }

  if (typeof items === "string") {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-5">
        <p className="text-sm text-muted-foreground">{items}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={`${item.company}-${item.product}`}
          className="rounded-xl border bg-card/70 p-4 shadow-sm"
        >
          <div className="space-y-1">
            <p className="font-medium">{item.product}</p>
            <p className="text-sm text-muted-foreground">{item.company}</p>
          </div>
          <div className="mt-3">
            <ExpandableText
              id={`${item.company}-${item.product}`}
              text={item.effects}
              expanded={Boolean(expandedItems[`${item.company}-${item.product}`])}
              onToggle={onToggle}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.sources.map((source) => (
              <a
                key={source}
                href={source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-[color:var(--brand)]/30 bg-[color:var(--brand)]/10 px-3 py-1 text-sm font-medium text-[var(--brand)] transition-colors hover:border-[color:var(--brand)] hover:bg-[color:var(--brand)]/15"
              >
                {getSourceLabel(source)}
              </a>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface DashboardProps {
  reportId?: string | null;
}

export function Dashboard({ reportId = null }: DashboardProps) {
  const navigate = useNavigate();
  const [historyFilter, setHistoryFilter] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const reports = useReports({ fetcher: listReports });
  const detail = useReport({
    id: reportId ?? "",
    fetcher: getReport,
    enabled: reportId !== null,
  });
  const remove = useMutation({ mutationFn: deleteReport });
  useReportRealtime({ reportId, realtimeService });

  useEffect(() => {
    if (!reportId && reports.data?.[0]) {
      navigate({
        to: "/dashboard",
        search: { reportId: reports.data[0].id },
      });
    }
  }, [navigate, reportId, reports.data]);

  const selectedReport =
    detail.data ?? reports.data?.find((report) => report.id === reportId) ?? null;
  const selectedStatusMeta = selectedReport ? reportStatusMeta[selectedReport.status] : null;
  const selectedDuration = selectedReport ? getReportDuration(selectedReport) : null;
  const filteredReports =
    reports.data?.filter((report) => {
      const haystack = `${report.topic} ${report.result?.trend_name ?? ""}`.toLowerCase();
      return haystack.includes(historyFilter.trim().toLowerCase());
    }) ?? [];

  const toggleExpandedItem = (id: string) => {
    setExpandedItems((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">TrendScout</h1>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate report</CardTitle>
                <CardDescription>Submit a trend topic for the research pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <TopicForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>{reports.data?.length ?? 0} reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value)}
                  placeholder="Найти отчет"
                />
                {reports.isLoading && (
                  <p className="text-sm text-muted-foreground">Loading reports...</p>
                )}
                {reports.isError && (
                  <p className="text-sm text-destructive">Failed to load reports.</p>
                )}
                {reports.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No reports yet. Submit your first topic.
                  </p>
                )}
                {reports.data?.length !== 0 && filteredReports.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ничего не найдено по этому фильтру.
                  </p>
                )}
                {filteredReports.map((report) => {
                  const duration = getReportDuration(report);

                  return (
                    <div
                      key={report.id}
                      className="flex items-start gap-2 rounded-lg border p-3 transition-colors hover:border-[var(--brand)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: "/dashboard",
                            search: { reportId: report.id },
                          })
                        }
                        className="flex min-w-0 flex-1 items-start justify-between text-left"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{report.topic}</p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{report.createdAt}</span>
                            {duration && (
                              <>
                                <span>•</span>
                                <span>{duration}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {renderStatusBadge(report.status)}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Удалить отчет ${report.topic}`}
                        onClick={() =>
                          remove.mutate(report.id, {
                            onSuccess: () => {
                              if (report.id === reportId) {
                                navigate({ to: "/dashboard", search: {} });
                              }
                            },
                          })
                        }
                        disabled={remove.isPending}
                      >
                        Удалить
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{selectedReport?.topic ?? "Latest report"}</CardTitle>
                  {selectedDuration && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Время обработки: {selectedDuration}
                    </p>
                  )}
                </div>
                {selectedReport && renderStatusBadge(selectedReport.status)}
              </div>
              <CardDescription>
                {selectedReport
                  ? `Status: ${selectedReport.status} (${selectedStatusMeta?.label})`
                  : "Select a report from history."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedReport && (
                <p className="text-sm text-muted-foreground">No report selected yet.</p>
              )}

              {selectedReport && (
                <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
                  {renderStatusBadge(selectedReport.status)}
                  <p className="text-sm text-muted-foreground">
                    Live updates are enabled for this report.
                  </p>
                </div>
              )}

              {selectedReport && selectedReport.status === "error" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {selectedReport.error ?? "Report generation failed. Try a different topic."}
                </div>
              )}

              {selectedReport &&
                selectedReport.result === null &&
                selectedReport.status !== "error" && (
                  <p className="text-sm text-muted-foreground">
                    {selectedStatusMeta?.pendingCopy ??
                      "Report is still processing. Results will appear here when validation completes."}
                  </p>
                )}

              {selectedReport?.result && (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Trend</p>
                      <p className="text-lg font-semibold">{selectedReport.result.trend_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Sustainability score</p>
                      <p className="text-3xl font-bold">
                        {selectedReport.result.sustainability.score}/10
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="space-y-3">
                      <h2 className="text-lg font-semibold">Global market</h2>
                      {renderMarket(selectedReport.result.global_market, {
                        expandedItems,
                        onToggle: toggleExpandedItem,
                      })}
                    </section>

                    <section className="space-y-3">
                      <h2 className="text-lg font-semibold">RU market</h2>
                      {renderMarket(selectedReport.result.ru_market, {
                        expandedItems,
                        onToggle: toggleExpandedItem,
                      })}
                    </section>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Arguments for</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedReport.result.sustainability.arguments_for.map((item) => (
                            <li key={item} className="text-sm text-foreground/90">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Arguments against</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedReport.result.sustainability.arguments_against.map((item) => (
                            <li key={item} className="text-sm text-foreground/90">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
