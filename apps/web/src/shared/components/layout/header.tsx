import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Separator } from "@/shared/ui/separator";
import { SidebarTrigger } from "@/shared/ui/sidebar";

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop);
    };

    document.addEventListener("scroll", onScroll, { passive: true });

    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "z-50 h-14 relative",
        fixed && "header-fixed peer/header sticky top-0 w-[inherit]",
        offset > 10 && fixed ? "shadow-sm" : "shadow-none",
        className,
      )}
      style={{
        background:
          "linear-gradient(to right, oklch(1 0 0), oklch(0.99 0.003 60 / 0.6), oklch(1 0 0))",
      }}
      {...props}
    >
      {/* Gradient signal border */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent 5%, var(--brand-muted) 40%, var(--brand) 50%, var(--brand-muted) 60%, transparent 95%)",
        }}
      />

      <div
        className={cn(
          "relative flex h-full items-center gap-3 px-4 sm:gap-4",
          offset > 10 &&
            fixed &&
            "after:absolute after:inset-0 after:-z-10 after:bg-background/20 after:backdrop-blur-lg",
        )}
      >
        <SidebarTrigger variant="outline" className="max-md:scale-125 shrink-0" />
        <Separator orientation="vertical" className="h-5 opacity-40" />
        {children}
      </div>
    </header>
  );
}
