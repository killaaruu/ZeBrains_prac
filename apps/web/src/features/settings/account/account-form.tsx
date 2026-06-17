import { zodResolver } from "@hookform/resolvers/zod";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DatePicker } from "@/shared/components/date-picker";
import { showSubmittedData } from "@/shared/lib/show-submitted-data";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

const languages = [
  { label: "Английский", value: "en" },
  { label: "Французский", value: "fr" },
  { label: "Немецкий", value: "de" },
  { label: "Испанский", value: "es" },
  { label: "Португальский", value: "pt" },
  { label: "Русский", value: "ru" },
  { label: "Японский", value: "ja" },
  { label: "Корейский", value: "ko" },
  { label: "Китайский", value: "zh" },
] as const;

const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, "Введите ваше имя.")
    .min(2, "Имя должно содержать минимум 2 символа.")
    .max(30, "Имя не должно превышать 30 символов."),
  dob: z.date({ required_error: "Выберите дату рождения." }),
  language: z.string({ required_error: "Выберите язык." }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues: Partial<AccountFormValues> = { name: "" };

export function AccountForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  });

  function onSubmit(data: AccountFormValues) {
    showSubmittedData(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input placeholder="Ваше имя" {...field} />
              </FormControl>
              <FormDescription>
                Это имя будет отображаться в вашем профиле и письмах.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Дата рождения</FormLabel>
              <DatePicker selected={field.value} onSelect={field.onChange} />
              <FormDescription>Дата рождения используется для расчёта возраста.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Язык</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value
                        ? languages.find((language) => language.value === field.value)?.label
                        : "Выберите язык"}
                      <CaretSortIcon className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Поиск языка..." />
                    <CommandEmpty>Язык не найден.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue("language", language.value);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "size-4",
                                language.value === field.value ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Этот язык будет использоваться в панели управления.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Обновить аккаунт</Button>
      </form>
    </Form>
  );
}
