import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnFiltersState, OnChangeFn, PaginationState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

type UseTableUrlStateParams = {
  pagination?: {
    pageKey?: string;
    pageSizeKey?: string;
    defaultPage?: number;
    defaultPageSize?: number;
  };
  globalFilter?: {
    enabled?: boolean;
    key?: string;
    trim?: boolean;
  };
  columnFilters?: Array<
    | {
        columnId: string;
        searchKey: string;
        type?: "string";
        serialize?: (value: unknown) => unknown;
        deserialize?: (value: unknown) => unknown;
      }
    | {
        columnId: string;
        searchKey: string;
        type: "array";
        serialize?: (value: unknown) => unknown;
        deserialize?: (value: unknown) => unknown;
      }
  >;
};

type UseTableUrlStateReturn = {
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  ensurePageInRange: (pageCount: number, opts?: { resetTo?: "first" | "last" }) => void;
};

export function useTableUrlState(params: UseTableUrlStateParams = {}): UseTableUrlStateReturn {
  const searchParams = useSearch({ strict: false });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    pagination: paginationCfg,
    globalFilter: globalFilterCfg,
    columnFilters: columnFiltersCfg = [],
  } = params;

  const pageKey = paginationCfg?.pageKey ?? "page";
  const pageSizeKey = paginationCfg?.pageSizeKey ?? "pageSize";
  const defaultPage = paginationCfg?.defaultPage ?? 1;
  const defaultPageSize = paginationCfg?.defaultPageSize ?? 10;

  const globalFilterKey = globalFilterCfg?.key ?? "filter";
  const globalFilterEnabled = globalFilterCfg?.enabled ?? true;
  const trimGlobal = globalFilterCfg?.trim ?? true;

  const getSearchParam = (key: string): string | null => {
    const params = searchParams as Record<string, unknown>;
    const val = params[key];
    if (val === undefined || val === null) return null;
    return String(val);
  };

  const getSearchParamAll = (key: string): string[] => {
    const params = searchParams as Record<string, unknown>;
    const val = params[key];
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val.map(String);
    return [String(val)];
  };

  const navigatePatch = useCallback(
    (patch: Record<string, unknown>) => {
      const current = new URLSearchParams();
      const existing = searchParams as Record<string, unknown>;
      for (const [k, v] of Object.entries(existing)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) current.append(k, String(item));
        } else {
          current.set(k, String(v));
        }
      }

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") {
          current.delete(key);
        } else if (Array.isArray(value)) {
          current.delete(key);
          for (const v of value) {
            current.append(key, String(v));
          }
        } else {
          current.set(key, String(value));
        }
      }

      const search: Record<string, string | string[]> = {};
      for (const key of new Set(current.keys())) {
        const values = current.getAll(key);
        search[key] = values.length === 1 ? values[0] : values;
      }

      navigate({ to: pathname, search });
    },
    [searchParams, navigate, pathname],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — derive from URL params
  const initialColumnFilters: ColumnFiltersState = useMemo(() => {
    const collected: ColumnFiltersState = [];
    for (const cfg of columnFiltersCfg) {
      const deserialize = cfg.deserialize ?? ((v: unknown) => v);
      if (cfg.type === "string") {
        const raw = getSearchParam(cfg.searchKey);
        const value = (deserialize(raw) as string) ?? "";
        if (typeof value === "string" && value.trim() !== "") {
          collected.push({ id: cfg.columnId, value });
        }
      } else {
        const raw = getSearchParamAll(cfg.searchKey);
        const value = (deserialize(raw) as unknown[]) ?? [];
        if (Array.isArray(value) && value.length > 0) {
          collected.push({ id: cfg.columnId, value });
        }
      }
    }
    return collected;
  }, [columnFiltersCfg, searchParams]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — derive from URL params
  const pagination: PaginationState = useMemo(() => {
    const rawPage = getSearchParam(pageKey);
    const rawPageSize = getSearchParam(pageSizeKey);
    const pageNum = rawPage ? Number(rawPage) : defaultPage;
    const pageSizeNum = rawPageSize ? Number(rawPageSize) : defaultPageSize;
    return { pageIndex: Math.max(0, pageNum - 1), pageSize: pageSizeNum };
  }, [searchParams, pageKey, pageSizeKey, defaultPage, defaultPageSize]);

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    const nextPage = next.pageIndex + 1;
    const nextPageSize = next.pageSize;
    navigatePatch({
      [pageKey]: nextPage <= defaultPage ? undefined : nextPage,
      [pageSizeKey]: nextPageSize === defaultPageSize ? undefined : nextPageSize,
    });
  };

  const [globalFilter, setGlobalFilter] = useState<string | undefined>(() => {
    if (!globalFilterEnabled) return undefined;
    const raw = getSearchParam(globalFilterKey);
    return raw ?? "";
  });

  const onGlobalFilterChange: OnChangeFn<string> | undefined = globalFilterEnabled
    ? (updater) => {
        const next = typeof updater === "function" ? updater(globalFilter ?? "") : updater;
        const value = trimGlobal ? next.trim() : next;
        setGlobalFilter(value);
        navigatePatch({
          [pageKey]: undefined,
          [globalFilterKey]: value || undefined,
        });
      }
    : undefined;

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = typeof updater === "function" ? updater(columnFilters) : updater;
    setColumnFilters(next);

    const patch: Record<string, unknown> = {};

    for (const cfg of columnFiltersCfg) {
      const found = next.find((f) => f.id === cfg.columnId);
      const serialize = cfg.serialize ?? ((v: unknown) => v);
      if (cfg.type === "string") {
        const value = typeof found?.value === "string" ? (found.value as string) : "";
        patch[cfg.searchKey] = value.trim() !== "" ? serialize(value) : undefined;
      } else {
        const value = Array.isArray(found?.value) ? (found.value as unknown[]) : [];
        patch[cfg.searchKey] = value.length > 0 ? serialize(value) : undefined;
      }
    }

    navigatePatch({ [pageKey]: undefined, ...patch });
  };

  const ensurePageInRange = (
    pageCount: number,
    opts: { resetTo?: "first" | "last" } = { resetTo: "first" },
  ) => {
    const rawPage = getSearchParam(pageKey);
    const pageNum = rawPage ? Number(rawPage) : defaultPage;
    if (pageCount > 0 && pageNum > pageCount) {
      navigatePatch({
        [pageKey]: opts.resetTo === "last" ? pageCount : undefined,
      });
    }
  };

  return {
    globalFilter: globalFilterEnabled ? (globalFilter ?? "") : undefined,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  };
}
