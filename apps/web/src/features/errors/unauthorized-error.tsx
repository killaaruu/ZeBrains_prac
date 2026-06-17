import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

export function UnauthorisedError() {
  const navigate = useNavigate();
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">401</h1>
        <span className="font-medium">Доступ не авторизован</span>
        <p className="text-center text-muted-foreground">
          Войдите с соответствующими учётными данными <br /> для доступа к этому ресурсу.
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
