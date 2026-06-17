export type NavTab = "modules" | "ddd";

type Props = { active: NavTab };

const TABS: Array<{ key: NavTab; label: string; href: string }> = [
  { key: "ddd", label: "DDD", href: "#/ddd" },
  { key: "modules", label: "Modules", href: "#/modules" },
];

export function Navbar({ active }: Props) {
  return (
    <nav className="sb-navbar">
      <span className="sb-navbar__brand">MadOS System Board</span>
      <div className="sb-navbar__tabs">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.href}
            className={`sb-tab${tab.key === active ? " is-active" : ""}`}
            aria-current={tab.key === active ? "page" : undefined}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
