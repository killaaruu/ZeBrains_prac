import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type {
  FilteredSubscription,
  IRealtimeService,
  RealtimeEvent,
  RealtimePayload,
  RowSubscription,
  TableSubscription,
  Unsubscribe,
} from "./realtime.interface";

type SupabaseRealtimeClient = Pick<
  SupabaseClient,
  "channel" | "removeAllChannels" | "removeChannel"
>;

type PostgresChangePayload<T> = {
  eventType: Exclude<RealtimeEvent, "*">;
  new: T | null;
  old: Partial<T> | null;
};

type PostgresChangesChannel = RealtimeChannel & {
  on: (
    type: "postgres_changes",
    filter: {
      event: "*" | "INSERT" | "UPDATE" | "DELETE";
      schema: string;
      table: string;
      filter?: string;
    },
    callback: (payload: PostgresChangePayload<unknown>) => void,
  ) => RealtimeChannel;
};

export class SupabaseRealtimeService implements IRealtimeService {
  private readonly channels = new Set<RealtimeChannel>();

  constructor(private readonly client: SupabaseRealtimeClient) {}

  subscribeToTable<T = Record<string, unknown>>(config: TableSubscription<T>): Unsubscribe {
    return this.subscribe(config);
  }

  subscribeToFiltered<T = Record<string, unknown>>(config: FilteredSubscription<T>): Unsubscribe {
    return this.subscribe(config, `${config.column}=eq.${config.value}`);
  }

  subscribeToRow<T = Record<string, unknown>>(config: RowSubscription<T>): Unsubscribe {
    const column = config.column ?? "id";
    return this.subscribe(config, `${column}=eq.${config.value}`);
  }

  unsubscribeAll(): void {
    void this.client.removeAllChannels();
    this.channels.clear();
  }

  private subscribe<T>(config: TableSubscription<T>, filter?: string): Unsubscribe {
    const channel = this.client.channel(
      this.createChannelName(config.table, filter),
    ) as PostgresChangesChannel;
    this.channels.add(channel);

    channel
      .on(
        "postgres_changes",
        {
          event: (config.event ?? "*") as "*" | "INSERT" | "UPDATE" | "DELETE",
          schema: config.schema ?? "public",
          table: config.table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          config.onData(this.mapPayload<T>(payload));
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          config.onError?.(error ?? new Error(`Realtime subscription failed: ${status}`));
        }
      });

    return () => {
      this.channels.delete(channel);
      void this.client.removeChannel(channel);
    };
  }

  private mapPayload<T>(payload: PostgresChangePayload<unknown>): RealtimePayload<T> {
    return {
      event: payload.eventType,
      new: payload.new as T | null,
      old: payload.old as Partial<T> | null,
    };
  }

  private createChannelName(table: string, filter?: string): string {
    return filter ? `realtime:${table}:${filter}` : `realtime:${table}`;
  }
}
