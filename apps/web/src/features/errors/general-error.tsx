import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean;
};

export function GeneralError({ className, minimal = false }: GeneralErrorProps) {
  const navigate = useNavigate();
  return (
    <div className={cn("h-svh w-full", className)}>
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        {!minimal && <h1 className="text-[7rem] leading-tight font-bold">500</h1>}
        <span className="font-medium">Что-то пошло не так {`:')`}</span>
        <p className="text-center text-muted-foreground">
          Приносим извинения за неудобства. <br /> Пожалуйста, попробуйте позже.
        </p>
        {!minimal && (
          <div className="mt-6 flex gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Назад
            </Button>
            <Button onClick={() => navigate({ to: "/" })}>На главную</Button>
          </div>
        )}
      </div>
    </div>
  );
}
