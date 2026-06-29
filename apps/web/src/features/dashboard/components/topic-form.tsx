import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateReport } from "@repo/client-core";
import { type CreateReport, createReportSchema } from "@repo/shared";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

const createReport = (input: CreateReport) => apiClient.post<{ id: string }>("/reports", input);

type TopicFormValues = z.input<typeof createReportSchema>;

export function TopicForm() {
  const navigate = useNavigate();
  const create = useCreateReport({ mutationFn: createReport });
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(createReportSchema),
    defaultValues: { topic: "" },
  });

  const onSubmit = async (values: TopicFormValues) => {
    const report = await create.mutateAsync(createReportSchema.parse(values));
    form.reset();
    navigate({
      to: "/dashboard",
      search: { reportId: report.id },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тема исследования</FormLabel>
              <FormControl>
                <Input placeholder="Электромобили" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Отправка..." : "Сгенерировать отчёт"}
        </Button>
      </form>
    </Form>
  );
}
