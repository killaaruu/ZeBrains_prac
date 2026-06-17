import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordInput } from "@/shared/components/password-input";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { useSignIn } from "../hooks/use-sign-in";

const formSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
  password: z
    .string()
    .min(1, "Введите пароль")
    .min(7, "Пароль должен содержать минимум 7 символов"),
});

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string;
  returnUrl?: string;
}

export function UserAuthForm({ className, redirectTo, returnUrl, ...props }: UserAuthFormProps) {
  const signIn = useSignIn({ redirectTo, returnUrl });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast.promise(signIn.mutateAsync(data), {
      loading: "Вход...",
      success: "С возвращением!",
      error: (err) => err.message || "Не удалось войти",
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-3", className)}
        {...props}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Электронная почта</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to="/forgot-password"
                className="absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75"
              >
                Забыли пароль?
              </Link>
            </FormItem>
          )}
        />
        <Button className="mt-2" disabled={signIn.isPending}>
          Войти
        </Button>
      </form>
    </Form>
  );
}
