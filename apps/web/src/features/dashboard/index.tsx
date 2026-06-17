import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { ProfileDropdown } from "@/shared/components/profile-dropdown";
import { ThemeSwitch } from "@/shared/components/theme-switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const cards = [
  {
    title: "Example CRUD",
    description: "A full data flow: Zod contract → API → TanStack Query hook → form.",
    href: "/example",
  },
  {
    title: "Health",
    description: "Live readout of the API /health endpoint.",
    href: "/health",
  },
  {
    title: "Settings",
    description: "Profile, account, appearance, and notification preferences.",
    href: "/settings",
  },
];

export function Dashboard() {
  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Welcome 👋</h2>
          <p className="text-muted-foreground">
            This starter ships an auth shell, a dashboard layout, and an example domain. Replace
            these with your product features.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <a key={card.href} href={card.href} className="block">
              <Card className="h-full transition-colors hover:border-[var(--brand)]">
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{card.href}</CardContent>
              </Card>
            </a>
          ))}
        </div>
      </Main>
    </>
  );
}
