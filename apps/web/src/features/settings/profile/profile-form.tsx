import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { showSubmittedData } from "@/shared/lib/show-submitted-data";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

const profileFormSchema = z.object({
  username: z
    .string()
    .min(1, "Введите имя пользователя.")
    .min(2, "Имя пользователя должно содержать минимум 2 символа.")
    .max(30, "Имя пользователя не должно превышать 30 символов."),
  email: z.string().min(1, "Выберите email для отображения.").email(),
  bio: z.string().max(160).min(4),
  urls: z.array(z.object({ value: z.string().url("Введите корректный URL.") })).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const defaultValues: Partial<ProfileFormValues> = {
  bio: "I own a computer.",
  urls: [{ value: "https://shadcn.com" }, { value: "http://twitter.com/shadcn" }],
};

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append } = useFieldArray({
    name: "urls",
    control: form.control,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => showSubmittedData(data))} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя пользователя</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                Это ваше публичное имя. Может быть настоящим именем или псевдонимом. Изменить можно
                раз в 30 дней.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Электронная почта</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подтверждённый email" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="m@example.com">m@example.com</SelectItem>
                  <SelectItem value="m@google.com">m@google.com</SelectItem>
                  <SelectItem value="m@support.com">m@support.com</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Управлять подтверждёнными адресами можно в <Link to="/">настройках почты</Link>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>О себе</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Расскажите немного о себе"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Вы можете <span>@упомянуть</span> других пользователей и организации.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && "sr-only")}>Ссылки</FormLabel>
                  <FormDescription className={cn(index !== 0 && "sr-only")}>
                    Добавьте ссылки на ваш сайт, блог или профили в соцсетях.
                  </FormDescription>
                  <FormControl className={cn(index !== 0 && "mt-1.5")}>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ value: "" })}
          >
            Добавить ссылку
          </Button>
        </div>
        <Button type="submit">Обновить профиль</Button>
      </form>
    </Form>
  );
}
