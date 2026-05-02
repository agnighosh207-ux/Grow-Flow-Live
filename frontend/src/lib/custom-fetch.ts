import { toast } from "@/hooks/use-toast";

export async function customFetch(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
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
      } else if (response.status === 401) {
        // Authentication issues are usually handled by Clerk, but we can log it
        console.error("Unauthorized request to:", url);
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
      throw error;
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      toast({ 
        variant: "destructive", 
        title: "Request Timeout", 
        description: "The request took too long. Please try again." 
      });
      throw new Error("Request timeout");
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
