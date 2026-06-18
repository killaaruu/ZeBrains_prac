import { useReport, useReports } from "@repo/client-core";
import type { Report, ReportResult } from "@repo/shared";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { ProfileDropdown } from "@/shared/components/profile-dropdown";
import { ThemeSwitch } from "@/shared/components/theme-switch";
import { apiClient } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TopicForm } from "./components/topic-form";

const listReports = () => apiClient.get<Report[]>("/reports");
const getReport = (id: string) => apiClient.get<Report>(`/reports/${id}`);

function renderMarket(items: ReportResult["global_market"] | ReportResult["ru_market"]) {
  if (items === null || items === undefined) {
    return <p className="text-sm text-muted-foreground">No validated findings yet.</p>;
  }

  if (typeof items === "string") {
    return <p className="text-sm text-muted-foreground">{items}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.company}-${item.product}`} className="rounded-lg border p-3">
          <p className="font-medium">{item.product}</p>
          <p className="text-sm text-muted-foreground">{item.company}</p>
          <p className="mt-2 text-sm">{item.effects}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.sources.map((source) => (
              <a
                key={source}
                href={source}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--brand)] underline underline-offset-4"
              >
                Source
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
                    <Badge variant="outline">{report.status}</Badge>
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
                  ? `Status: ${selectedReport.status}`
                  : "Select a report from history."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedReport && (
                <p className="text-sm text-muted-foreground">No report selected yet.</p>
              )}

              {selectedReport && selectedReport.result === null && (
                <p className="text-sm text-muted-foreground">
                  Report is still processing. Results will appear here when validation completes.
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
                      <CardContent className="space-y-2">
                        {selectedReport.result.sustainability.arguments_for.map((item) => (
                          <p key={item} className="text-sm">
                            {item}
                          </p>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Arguments against</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedReport.result.sustainability.arguments_against.map((item) => (
                          <p key={item} className="text-sm">
                            {item}
                          </p>
                        ))}
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
