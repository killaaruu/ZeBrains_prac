import { Button } from "@/shared/ui/button";

export function MaintenanceError() {
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">503</h1>
        <span className="font-medium">Сайт на техническом обслуживании!</span>
        <p className="text-center text-muted-foreground">
          Сайт временно недоступен. <br />
          Мы скоро вернёмся.
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline">Подробнее</Button>
        </div>
      </div>
    </div>
  );
}
