import { useCreateReport, useReport, useReports } from "@repo/client-core";
import type { CreateReport, Report, ReportResult } from "@repo/shared";
import { useEffect, useState } from "react";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { ProfileDropdown } from "@/shared/components/profile-dropdown";
import { ThemeSwitch } from "@/shared/components/theme-switch";
import { apiClient } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const createReport = (input: CreateReport) => apiClient.post<{ id: string }>("/reports", input);
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

export function Dashboard() {
  const [topic, setTopic] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reports = useReports({ fetcher: listReports });
  const create = useCreateReport({ mutationFn: createReport });
  const detail = useReport({
    id: selectedReportId ?? "",
    fetcher: getReport,
    enabled: selectedReportId !== null,
  });

  useEffect(() => {
    if (!selectedReportId && reports.data?.[0]) {
      setSelectedReportId(reports.data[0].id);
    }
  }, [reports.data, selectedReportId]);

  const selectedReport =
    detail.data ?? reports.data?.find((report) => report.id === selectedReportId) ?? null;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    create.mutate(
      { topic },
      {
        onSuccess: ({ id }) => {
          setTopic("");
          setSelectedReportId(id);
        },
      },
    );
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
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-topic">Research topic</Label>
                    <Input
                      id="report-topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      placeholder="AI coding assistants"
                    />
                  </div>
                  <Button type="submit" disabled={create.isPending || topic.trim().length === 0}>
                    {create.isPending ? "Submitting..." : "Generate report"}
                  </Button>
                </form>
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
                    onClick={() => setSelectedReportId(report.id)}
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
