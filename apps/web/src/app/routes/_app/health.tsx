import { createFileRoute } from "@tanstack/react-router";
import { HealthPage } from "@/features/health";

export const Route = createFileRoute("/_app/health")({
  component: HealthPage,
});
