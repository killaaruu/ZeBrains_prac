import { createFileRoute } from "@tanstack/react-router";
import SettingsAccount from "@/features/settings/account";

export const Route = createFileRoute("/_app/settings/account")({
  component: AccountPage,
});

function AccountPage() {
  return <SettingsAccount />;
}
