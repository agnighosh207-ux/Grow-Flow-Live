import { toast } from "@/hooks/use-toast";

/**
 * Core API Client with built-in:
 * 1. Automatic /api prefixing
 * 2. Timeout (30s)
 * 3. Global error toasting
 * 4. AbortController support
 * 5. Plan-limit event broadcasting (402)
 */

async function internalFetch(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  const finalSignal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;

  try {
    const response = await fetch(url, {
      ...options,
      signal: finalSignal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMessage = "An unexpected error occurred.";
      let errorData: any = {};
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      
      if (response.status === 402) {
        // Specific handling for plan limits
        const event = new CustomEvent('plan-limit-reached', { detail: { message: errorMessage } });
        window.dispatchEvent(event);
      } else if (response.status === 503) {
        toast({ 
          variant: "destructive", 
          title: response.statusText === "Service Unavailable: Maintenance Mode" ? "Scheduled Maintenance" : "Service Overloaded", 
          description: errorMessage || "Our AI engine is busy. Please try again in a few seconds." 
        });
      } else if (response.status >= 500) {
        toast({ 
          variant: "destructive", 
          title: "Server Error", 
          description: "Something went wrong on our end. We've been notified." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Request Failed", 
          description: errorMessage 
        });
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }
    
    return { data: await response.json() };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // Don't toast for manual aborts, only for timeouts
      if (!options.signal?.aborted) {
        toast({ 
          variant: "destructive", 
          title: "Request Timeout", 
          description: "The request took too long. Please try again." 
        });
      }
      throw error;
    }
    if (error.message === 'Failed to fetch') {
      toast({ 
        variant: "destructive", 
        title: "Connection Error", 
        description: "Unable to reach the server. Please check your internet." 
      });
    }
    throw error;
  }
}

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

    return internalFetch(fullUrl, {
      ...options,
      method: "GET",
      credentials: "include",
    });
  },
  post: async (url: string, body: any = {}, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    return internalFetch(fullUrl, {
      ...options,
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  },
  patch: async (url: string, body: any = {}, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    return internalFetch(fullUrl, {
      ...options,
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
  },
  delete: async (url: string, options: any = {}) => {
    const fullUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
    return internalFetch(fullUrl, {
      ...options,
      method: "DELETE",
      credentials: "include",
    });
  },
};
