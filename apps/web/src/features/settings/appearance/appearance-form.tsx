import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fonts } from "@/shared/config/fonts";
import { useFont } from "@/shared/context/font-provider";
import { showSubmittedData } from "@/shared/lib/show-submitted-data";
import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";

const appearanceFormSchema = z.object({
  font: z.enum(fonts),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function AppearanceForm() {
  const { font, setFont } = useFont();

  const defaultValues: Partial<AppearanceFormValues> = {
    font,
  };

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  });

  function onSubmit(data: AppearanceFormValues) {
    if (data.font !== font) setFont(data.font);
    showSubmittedData(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="font"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Шрифт</FormLabel>
              <div className="relative w-max">
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-[200px] appearance-none font-normal capitalize",
                      "dark:bg-background dark:hover:bg-background",
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className="absolute end-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
              <FormDescription className="font-manrope">
                Выберите шрифт для панели управления.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Обновить настройки</Button>
      </form>
    </Form>
  );
}
