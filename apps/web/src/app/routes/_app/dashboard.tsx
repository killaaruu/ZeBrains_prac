import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Dashboard } from "@/features/dashboard";

const dashboardSearchSchema = z.object({
  reportId: z.string().optional(),
});

export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: dashboardSearchSchema,
  component: DashboardRoute,
});

function DashboardRoute() {
  const { reportId } = Route.useSearch();

  return <Dashboard reportId={reportId ?? null} />;
}
