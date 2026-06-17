import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { AuthLayout } from "../components/auth-layout";
import { UserAuthForm } from "./user-auth-form";

interface SignInProps {
  returnUrl?: string;
}

export default function SignIn({ returnUrl }: SignInProps = {}) {
  return (
    <AuthLayout>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Вход</CardTitle>
          <CardDescription>
            Введите email и пароль, чтобы <br />
            войти в аккаунт
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm returnUrl={returnUrl} />
        </CardContent>
        <CardFooter>
          <p className="px-8 text-center text-sm text-muted-foreground">
            Нажимая «Войти», вы соглашаетесь с{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-primary">
              Условиями использования
            </a>{" "}
            и{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Политикой конфиденциальности
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
