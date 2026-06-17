import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ExampleListResult,
  useCreateExample,
  useDeleteExample,
  useExampleList,
} from "@repo/client-core";
import {
  type CreateExampleEntity,
  createExampleEntitySchema,
  type ExampleEntity,
} from "@repo/shared";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Header } from "@/shared/components/layout/header";
import { Main } from "@/shared/components/layout/main";
import { apiClient } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const listFetcher = (params: { limit?: number; offset?: number }) =>
  apiClient.get<ExampleListResult>("/example-entities", params);
const createFetcher = (input: CreateExampleEntity) =>
  apiClient.post<ExampleEntity>("/example-entities", input);
const deleteFetcher = (id: string) => apiClient.delete<void>(`/example-entities/${id}`);

export function ExamplePage() {
  const list = useExampleList({ fetcher: listFetcher });
  const create = useCreateExample({ mutationFn: createFetcher });
  const remove = useDeleteExample({ mutationFn: deleteFetcher });

  const form = useForm<CreateExampleEntity>({
    resolver: zodResolver(createExampleEntitySchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success("Entity created");
      },
      onError: (err) => toast.error((err as { message?: string })?.message ?? "Create failed"),
    });
  });

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">Example CRUD</h1>
      </Header>
      <Main>
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create</CardTitle>
              <CardDescription>Validated by the shared Zod contract.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register("name")} placeholder="My entity" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    {...form.register("description")}
                    placeholder="Optional"
                  />
                </div>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entities</CardTitle>
              <CardDescription>{list.data?.total ?? 0} total</CardDescription>
            </CardHeader>
            <CardContent>
              {list.isLoading && <p className="text-muted-foreground">Loading…</p>}
              {list.isError && <p className="text-destructive">Failed to load entities</p>}
              {list.data && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.data.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          No entities yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {list.data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove.mutate(item.id)}
                            disabled={remove.isPending}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
