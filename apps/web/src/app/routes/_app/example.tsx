import { createFileRoute } from "@tanstack/react-router";
import { ExamplePage } from "@/features/example";

export const Route = createFileRoute("/_app/example")({
  component: ExamplePage,
});
