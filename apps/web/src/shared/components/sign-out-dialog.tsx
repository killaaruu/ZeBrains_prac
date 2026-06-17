import { useNavigate } from "@tanstack/react-router";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate({ to: "/sign-in" });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Выход"
      desc="Вы уверены, что хотите выйти? Для доступа к аккаунту потребуется повторный вход."
      confirmText="Выйти"
      destructive
      handleConfirm={handleSignOut}
      className="sm:max-w-sm"
    />
  );
}
