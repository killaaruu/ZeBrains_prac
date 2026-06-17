import { useQuery } from "@tanstack/react-query";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { apiClient } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface HealthResponse {
  status: string;
  info?: Record<string, { status: string }>;
}

export function HealthPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.get<HealthResponse>("/health"),
  });

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">Health</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              API status
              {data?.status && (
                <Badge variant={data.status === "ok" ? "default" : "destructive"}>
                  {data.status}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Result of the API `/health` check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {isError && (
              <p className="text-destructive">
                {(error as { message?: string })?.message ?? "Failed to reach the API"}
              </p>
            )}
            {data?.info && (
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {JSON.stringify(data.info, null, 2)}
              </pre>
            )}
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
