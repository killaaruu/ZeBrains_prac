import { createFileRoute } from "@tanstack/react-router";
import SettingsNotifications from "@/features/settings/notifications";

export const Route = createFileRoute("/_app/settings/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return <SettingsNotifications />;
}
