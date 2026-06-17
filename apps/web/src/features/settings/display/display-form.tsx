import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { showSubmittedData } from "@/shared/lib/show-submitted-data";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";

const items = [
  { id: "recents", label: "Недавние" },
  { id: "home", label: "Главная" },
  { id: "applications", label: "Приложения" },
  { id: "desktop", label: "Рабочий стол" },
  { id: "downloads", label: "Загрузки" },
  { id: "documents", label: "Документы" },
] as const;

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Необходимо выбрать хотя бы один элемент.",
  }),
});

type DisplayFormValues = z.infer<typeof displayFormSchema>;

const defaultValues: Partial<DisplayFormValues> = { items: ["recents", "home"] };

export function DisplayForm() {
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => showSubmittedData(data))} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Боковая панель</FormLabel>
                <FormDescription>
                  Выберите элементы для отображения в боковой панели.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="items"
                  render={({ field }) => (
                    <FormItem key={item.id} className="flex flex-row items-start">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) =>
                            checked
                              ? field.onChange([...field.value, item.id])
                              : field.onChange(field.value?.filter((value) => value !== item.id))
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{item.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Обновить отображение</Button>
      </form>
    </Form>
  );
}
