import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseRealtimeService } from "./supabase-realtime.service";

describe("SupabaseRealtimeService", () => {
  it("subscribes to a single row and forwards postgres change payloads", () => {
    const subscribe = vi.fn();
    let onData:
      | ((payload: { eventType: "UPDATE"; new: { id: string }; old: { id: string } }) => void)
      | undefined;

    const channel = {
      on: vi.fn((_type, filter, callback) => {
        expect(filter).toMatchObject({
          event: "*",
          schema: "public",
          table: "reports",
          filter: "id=eq.report-123",
        });
        onData = callback;
        return channel;
      }),
      subscribe: vi.fn((callback) => {
        subscribe(callback);
        return channel;
      }),
    } as unknown as RealtimeChannel;

    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
    } as unknown as SupabaseClient;

    const service = new SupabaseRealtimeService(client);
    const handleData = vi.fn();

    service.subscribeToRow<{ id: string }>({
      table: "reports",
      value: "report-123",
      onData: handleData,
    });

    if (!onData) {
      throw new Error("Expected realtime callback to be registered");
    }

    onData({
      eventType: "UPDATE",
      new: { id: "report-123" },
      old: { id: "report-123" },
    });

    expect(client.channel).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalled();
    expect(handleData).toHaveBeenCalledWith({
      event: "UPDATE",
      new: { id: "report-123" },
      old: { id: "report-123" },
    });
  });

  it("removes the created channel on unsubscribe", () => {
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn(() => channel),
    } as unknown as RealtimeChannel;

    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
    } as unknown as SupabaseClient;

    const service = new SupabaseRealtimeService(client);

    const unsubscribe = service.subscribeToRow({
      table: "reports",
      value: "report-123",
      onData: vi.fn(),
    });

    unsubscribe();

    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
