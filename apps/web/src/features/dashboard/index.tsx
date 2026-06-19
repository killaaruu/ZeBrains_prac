import { useReport, useReportRealtime, useReports } from "@repo/client-core";
import type { Report, ReportResult, ReportStatus } from "@repo/shared";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { ProfileDropdown } from "@/shared/components/profile-dropdown";
import { ThemeSwitch } from "@/shared/components/theme-switch";
import { apiClient } from "@/shared/lib/api-client";
import { realtimeService } from "@/shared/lib/supabase";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TopicForm } from "./components/topic-form";

const listReports = () => apiClient.get<Report[]>("/reports");
const getReport = (id: string) => apiClient.get<Report>(`/reports/${id}`);
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

function renderMarket(items: ReportResult["global_market"] | ReportResult["ru_market"]) {
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
          <p className="mt-3 text-sm leading-6 text-foreground/90">{item.effects}</p>
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
  const reports = useReports({ fetcher: listReports });
  const detail = useReport({
    id: reportId ?? "",
    fetcher: getReport,
    enabled: reportId !== null,
  });
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
                {reports.data?.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/dashboard",
                        search: { reportId: report.id },
                      })
                    }
                    className="flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors hover:border-[var(--brand)]"
                  >
                    <div>
                      <p className="font-medium">{report.topic}</p>
                      <p className="text-sm text-muted-foreground">{report.createdAt}</p>
                    </div>
                    {renderStatusBadge(report.status)}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{selectedReport?.topic ?? "Latest report"}</CardTitle>
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
                      {renderMarket(selectedReport.result.global_market)}
                    </section>

                    <section className="space-y-3">
                      <h2 className="text-lg font-semibold">RU market</h2>
                      {renderMarket(selectedReport.result.ru_market)}
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
