import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  authService: { getSession: mocks.getSession },
}));

vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: { create: vi.fn(() => mockInstance) } };
});

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports an http axios instance", async () => {
    const { http } = await import("./api-client");
    expect(http).toBeDefined();
    expect(http.defaults).toBeDefined();
  });

  it("apiClient.get resolves with response data", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.get).mockResolvedValueOnce({ data: { id: 1 } } as never);
    const result = await apiClient.get("/users");
    expect(result).toEqual({ id: 1 });
    expect(http.get).toHaveBeenCalledWith("/users", { params: undefined });
  });

  it("apiClient.post sends body and resolves with data", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.post).mockResolvedValueOnce({ data: { created: true } } as never);
    const result = await apiClient.post("/users", { name: "Alice" });
    expect(result).toEqual({ created: true });
    expect(http.post).toHaveBeenCalledWith("/users", { name: "Alice" }, undefined);
  });

  it("apiClient.fetch returns a fetch-compatible Response through axios interceptors", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.request).mockResolvedValueOnce({
      data: { data: [], count: 0 },
      headers: { "content-type": "application/json" },
      status: 200,
    } as never);

    const response = await apiClient.fetch("https://api.example.test/example-entities", {
      method: "GET",
      headers: { authorization: "Bearer token-1" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [], count: 0 });
    expect(http.request).toHaveBeenCalledWith({
      data: undefined,
      headers: { authorization: "Bearer token-1" },
      method: "GET",
      url: "https://api.example.test/example-entities",
    });
  });

  it("apiClient.fetch converts normalized axios errors back to Response objects", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.request).mockRejectedValueOnce({
      status: 401,
      message: "Unauthorized",
    });

    const response = await apiClient.fetch("https://api.example.test/example-entities", {
      method: "GET",
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      status: 401,
      message: "Unauthorized",
    });
  });

  it("apiClient.fetch converts network errors to valid fetch Response objects", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.request).mockRejectedValueOnce({
      status: 0,
      message: "Network Error",
      code: "ERR_NETWORK",
    });

    const response = await apiClient.fetch("https://api.example.test/example-entities", {
      method: "GET",
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 503,
      message: "Network Error",
      code: "ERR_NETWORK",
    });
  });

  it("adds the current Supabase session token to API requests", async () => {
    const { http } = await import("./api-client");
    mocks.getSession.mockResolvedValue({ accessToken: "session-token" });

    const requestInterceptor = vi.mocked(http.interceptors.request.use).mock.calls[0]?.[0];
    const config = await requestInterceptor?.({ headers: {} } as never);

    expect(config?.headers).toMatchObject({ Authorization: "Bearer session-token" });
  });

  it("redirects to sign in when API returns 401", async () => {
    const { http } = await import("./api-client");
    mocks.getSession.mockResolvedValue(null);
    window.history.pushState({}, "", "/example?tab=1");

    const errorInterceptor = vi.mocked(http.interceptors.response.use).mock.calls[0]?.[1];
    await expect(
      errorInterceptor?.({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      }),
    ).rejects.toMatchObject({ status: 401, message: "Unauthorized" });

    expect(window.location.pathname).toBe("/sign-in");
    expect(window.location.search).toBe("?redirect=%2Fexample%3Ftab%3D1");
  });

  it("does not redirect on API 401 when a Supabase session is still present", async () => {
    const { http } = await import("./api-client");
    mocks.getSession.mockResolvedValue({ accessToken: "session-token" });
    window.history.pushState({}, "", "/protected");

    const errorInterceptor = vi.mocked(http.interceptors.response.use).mock.calls[0]?.[1];
    await expect(
      errorInterceptor?.({
        config: { url: "/protected/data" },
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      }),
    ).rejects.toMatchObject({ status: 401, message: "Unauthorized" });

    expect(window.location.pathname).toBe("/protected");
    expect(window.location.search).toBe("");
  });

  it("does not redirect again when a 401 happens on sign in", async () => {
    const { http } = await import("./api-client");
    mocks.getSession.mockResolvedValue(null);
    window.history.pushState({}, "", "/sign-in");

    const errorInterceptor = vi.mocked(http.interceptors.response.use).mock.calls[0]?.[1];
    await expect(
      errorInterceptor?.({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      }),
    ).rejects.toMatchObject({ status: 401, message: "Unauthorized" });

    expect(window.location.pathname).toBe("/sign-in");
    expect(window.location.search).toBe("");
  });

  it("does not redirect on auth bootstrap 401 because auth-store handles self-healing", async () => {
    const { http } = await import("./api-client");
    mocks.getSession.mockResolvedValue(null);
    window.history.pushState({}, "", "/protected");

    const errorInterceptor = vi.mocked(http.interceptors.response.use).mock.calls[0]?.[1];
    await expect(
      errorInterceptor?.({
        config: { url: "/auth/me" },
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      }),
    ).rejects.toMatchObject({ status: 401, message: "Unauthorized" });

    expect(window.location.pathname).toBe("/protected");
  });

  it("apiClient.patch resolves with data", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.patch).mockResolvedValueOnce({ data: { updated: true } } as never);
    const result = await apiClient.patch("/users/1", { name: "Bob" });
    expect(result).toEqual({ updated: true });
  });

  it("apiClient.delete resolves with data", async () => {
    const { apiClient, http } = await import("./api-client");
    vi.mocked(http.delete).mockResolvedValueOnce({ data: { deleted: true } } as never);
    const result = await apiClient.delete("/users/1");
    expect(result).toEqual({ deleted: true });
  });

  it("apiClient.postDownload resolves with blob and filename from Content-Disposition", async () => {
    const { apiClient, http } = await import("./api-client");
    const fakeBlob = new Blob(["bytes"], { type: "application/pdf" });
    vi.mocked(http.post).mockResolvedValueOnce({
      data: fakeBlob,
      headers: { "content-disposition": 'attachment; filename="CV_Test.pdf"' },
    } as never);

    const result = await apiClient.postDownload("/export", { templateId: "uuid", format: "pdf" });

    expect(result.blob).toBe(fakeBlob);
    expect(result.filename).toBe("CV_Test.pdf");
    expect(http.post).toHaveBeenCalledWith(
      "/export",
      { templateId: "uuid", format: "pdf" },
      { responseType: "blob" },
    );
  });
});
