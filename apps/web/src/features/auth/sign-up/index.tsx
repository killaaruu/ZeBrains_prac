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
import { SignUpForm } from "./sign-up-form";

export default function SignUp() {
  return (
    <AuthLayout>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Создание аккаунта</CardTitle>
          <CardDescription>
            Введите email и пароль для регистрации. <br />
            Уже есть аккаунт?{" "}
            <Link to="/sign-in" className="underline underline-offset-4 hover:text-primary">
              Войти
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className="px-8 text-center text-sm text-muted-foreground">
            Создавая аккаунт, вы соглашаетесь с{" "}
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
