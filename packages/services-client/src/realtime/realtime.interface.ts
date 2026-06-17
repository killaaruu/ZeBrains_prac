export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
export type Unsubscribe = () => void;

export interface RealtimePayload<T> {
  event: RealtimeEvent;
  new: T | null;
  old: Partial<T> | null;
}

export interface TableSubscription<T = Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  onData: (payload: RealtimePayload<T>) => void;
  onError?: (error: Error) => void;
}

export interface FilteredSubscription<T = Record<string, unknown>> extends TableSubscription<T> {
  column: string;
  value: string;
}

export interface RowSubscription<T = Record<string, unknown>> extends TableSubscription<T> {
  column?: string;
  value: string;
}

export interface IRealtimeService {
  subscribeToTable<T = Record<string, unknown>>(config: TableSubscription<T>): Unsubscribe;
  subscribeToFiltered<T = Record<string, unknown>>(config: FilteredSubscription<T>): Unsubscribe;
  subscribeToRow<T = Record<string, unknown>>(config: RowSubscription<T>): Unsubscribe;
  unsubscribeAll(): void;
}
