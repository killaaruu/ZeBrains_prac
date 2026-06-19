import type {
  FilteredSubscription,
  IRealtimeService,
  RowSubscription,
  TableSubscription,
  Unsubscribe,
} from "@repo/services-client/realtime";

const noopUnsubscribe: Unsubscribe = () => {};

export class LocalDevRealtimeService implements IRealtimeService {
  subscribeToTable<T = Record<string, unknown>>(_config: TableSubscription<T>): Unsubscribe {
    return noopUnsubscribe;
  }

  subscribeToFiltered<T = Record<string, unknown>>(_config: FilteredSubscription<T>): Unsubscribe {
    return noopUnsubscribe;
  }

  subscribeToRow<T = Record<string, unknown>>(_config: RowSubscription<T>): Unsubscribe {
    return noopUnsubscribe;
  }

  unsubscribeAll(): void {}
}
