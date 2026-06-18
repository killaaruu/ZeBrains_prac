export const reportKeys = {
  all: ["reports"] as const,
  list: () => ["reports", "list"] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
};
