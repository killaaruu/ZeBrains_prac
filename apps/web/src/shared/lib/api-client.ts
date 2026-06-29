import axios from "axios";
import { authService } from "./supabase";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3111";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    // The API is exposed to the Vercel frontend through a free ngrok tunnel, which
    // serves an HTML interstitial for browser-looking requests. Sending this header
    // on every request makes ngrok skip it and return the real JSON response.
    "ngrok-skip-browser-warning": "true",
  },
});

function isAuthBootstrapUrl(url: unknown) {
  if (typeof url !== "string") return false;
  return url === "/auth/me" || url === "/auth/register";
}

async function redirectToSignInOnUnauthorized(status: number, url: unknown) {
  if (status !== 401 || typeof window === "undefined") return;
  if (isAuthBootstrapUrl(url)) return;
  if (window.location.pathname === "/sign-in") return;
  const session = await authService.getSession();
  if (session?.accessToken) return;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(currentPath);
  window.history.pushState({}, "", `/sign-in?redirect=${redirect}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function toResponseBody(data: unknown) {
  if (data === undefined || data === null) return undefined;
  return typeof data === "string" ? data : JSON.stringify(data);
}

function toResponseHeaders(headers: unknown) {
  const result = new Headers();
  if (!headers || typeof headers !== "object") return result;

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      result.set(key, value);
    }
  }

  return result;
}

function toFetchResponse(input: { data?: unknown; headers?: unknown; status?: number }) {
  const status = normalizeResponseStatus(input.status);
  return new Response(toResponseBody(input.data), {
    headers: toResponseHeaders(input.headers),
    status,
  });
}

function normalizeResponseStatus(status: number | undefined) {
  if (status === undefined) return 200;
  return status >= 200 && status <= 599 ? status : 503;
}

function normalizeFetchUrl(input: Parameters<typeof fetch>[0]) {
  return input instanceof Request ? input.url : String(input);
}

http.interceptors.request.use(
  async (config) => {
    const session = await authService.getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;
      await redirectToSignInOnUnauthorized(status, error.config?.url);
      return Promise.reject({
        status,
        message: data?.message || "Request failed",
        ...data,
      });
    }
    return Promise.reject({
      message: error.message || "Network error",
      code: error.code,
    });
  },
);

export const apiClient = {
  fetch: async (input: Parameters<typeof fetch>[0], init: RequestInit = {}): Promise<Response> => {
    try {
      const response = await http.request({
        url: normalizeFetchUrl(input),
        method: init.method ?? "GET",
        headers: init.headers as never,
        data: init.body,
      });
      return toFetchResponse(response);
    } catch (error) {
      const normalized = error as {
        status?: number;
        message?: string;
        code?: string;
        headers?: unknown;
        data?: unknown;
      };
      return toFetchResponse({
        data: normalized.data ?? {
          status: normalizeResponseStatus(normalized.status),
          message: normalized.message ?? "Request failed",
          ...(normalized.code ? { code: normalized.code } : {}),
        },
        headers: normalized.headers,
        status: normalized.status,
      });
    }
  },
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const { data } = await http.get<T>(url, { params });
    return data;
  },
  post: async <T>(url: string, body: unknown, options?: { timeout?: number }): Promise<T> => {
    const { data } = await http.post<T>(url, body, options);
    return data;
  },
  patch: async <T>(url: string, body: unknown): Promise<T> => {
    const { data } = await http.patch<T>(url, body);
    return data;
  },
  put: async <T>(url: string, body: unknown): Promise<T> => {
    const { data } = await http.put<T>(url, body);
    return data;
  },
  delete: async <T>(url: string): Promise<T> => {
    const { data } = await http.delete<T>(url);
    return data;
  },
  download: async (url: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await http.get<Blob>(url, { responseType: "blob" });
    const disposition = response.headers["content-disposition"] ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? url.split("/").pop() ?? "download";
    return { blob: response.data, filename };
  },
  postDownload: async (url: string, body: unknown): Promise<{ blob: Blob; filename: string }> => {
    const response = await http.post<Blob>(url, body, { responseType: "blob" });
    const disposition = response.headers["content-disposition"] ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? url.split("/").pop() ?? "download";
    return { blob: response.data, filename };
  },
};
