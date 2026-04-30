import { toast } from "@/hooks/use-toast";

export async function customFetch(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    
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
          title: "Service Overloaded", 
          description: "Our AI engine is busy. Please try again in a few seconds." 
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
