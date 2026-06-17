import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { useForgotPassword } from "../hooks/use-forgot-password";

const formSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
});

export function ForgotPasswordForm({ className, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  const { mutateAsync, isPending } = useForgotPassword();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast.promise(mutateAsync({ email: data.email }), {
      loading: "Отправка письма...",
      success: `Письмо отправлено на ${data.email}`,
      error: (err: Error) => err?.message ?? "Ошибка отправки",
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-2", className)}
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
        <Button className="mt-2" disabled={isPending}>
          Продолжить
          {isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  );
}
