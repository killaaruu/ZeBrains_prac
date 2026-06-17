import { Bell, Monitor, Palette, UserCog, Wrench } from "lucide-react";
import { ConfigDrawer } from "@/shared/components/config-drawer";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { Separator } from "@/shared/ui/separator";
import { SidebarNav } from "./components/sidebar-nav";

const sidebarNavItems = [
  { title: "Профиль", href: "/settings", icon: <UserCog size={18} /> },
  { title: "Аккаунт", href: "/settings/account", icon: <Wrench size={18} /> },
  { title: "Внешний вид", href: "/settings/appearance", icon: <Palette size={18} /> },
  { title: "Уведомления", href: "/settings/notifications", icon: <Bell size={18} /> },
  { title: "Отображение", href: "/settings/display", icon: <Monitor size={18} /> },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header>
        <div className="flex flex-col justify-center">
          <h2 className="text-sm font-semibold leading-none">Настройки</h2>
          <p className="text-xs text-muted-foreground">
            Управление настройками аккаунта и предпочтениями уведомлений.
          </p>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <ConfigDrawer />
        </div>
      </Header>
      <Main fixed>
        <Separator className="my-4 lg:my-6" />
        <div className="flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
          <aside className="top-0 lg:sticky lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex w-full overflow-y-hidden p-1">{children}</div>
        </div>
      </Main>
    </>
  );
}
