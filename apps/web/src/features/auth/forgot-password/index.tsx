import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { AuthLayout } from "../components/auth-layout";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Восстановление пароля</CardTitle>
          <CardDescription>
            Введите email, указанный при регистрации, <br /> и мы отправим ссылку для сброса пароля.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter>
          <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/sign-up" className="underline underline-offset-4 hover:text-primary">
              Зарегистрироваться
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
