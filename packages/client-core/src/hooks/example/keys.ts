export interface ExampleListParams {
  limit?: number;
  offset?: number;
}

/** Query-key factory for the example domain (mandatory pattern, see CLAUDE.md). */
export const exampleKeys = {
  all: ["example-entities"] as const,
  list: (params?: ExampleListParams) => ["example-entities", "list", params] as const,
  detail: (id: string) => ["example-entities", "detail", id] as const,
};
