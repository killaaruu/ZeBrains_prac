import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

export function ForbiddenError() {
  const navigate = useNavigate();
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">403</h1>
        <span className="font-medium">Доступ запрещён</span>
        <p className="text-center text-muted-foreground">
          У вас нет необходимых прав <br />
          для просмотра этого ресурса.
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Назад
          </Button>
          <Button onClick={() => navigate({ to: "/" })}>На главную</Button>
        </div>
      </div>
    </div>
  );
}
