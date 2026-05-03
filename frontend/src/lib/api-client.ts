import { toast } from "@/hooks/use-toast";

// Simple API client wrapper to avoid repetitive fetch boilerplate
export const api = {
  get: async (url: string, options: any = {}) => {
    let fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) fullUrl += `?${qs}`;
    }

    const res = await fetch(fullUrl, {
      ...options,
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw { response: { data: err }, status: res.status };
    }
    return { data: await res.json() };
  },
  post: async (url: string, body: any = {}, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    const res = await fetch(fullUrl, {
      ...options,
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw { response: { data: err }, status: res.status };
    }
    return { data: await res.json() };
  },
  patch: async (url: string, body: any = {}, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    const res = await fetch(fullUrl, {
      ...options,
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw { response: { data: err }, status: res.status };
    }
    return { data: await res.json() };
  },
  delete: async (url: string, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    const res = await fetch(fullUrl, {
      ...options,
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw { response: { data: err }, status: res.status };
    }
    return { data: await res.json() };
  },
};
