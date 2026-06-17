import { createFileRoute } from "@tanstack/react-router";
import SettingsDisplay from "@/features/settings/display";

export const Route = createFileRoute("/_app/settings/display")({
  component: DisplayPage,
});

function DisplayPage() {
  return <SettingsDisplay />;
}
