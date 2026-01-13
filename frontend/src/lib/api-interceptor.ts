import { apiUrl } from "@/config";

// Global fetch interceptor to handle session expiry and API URL
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    // Convert relative API URLs to absolute URLs and ensure credentials are included
    let url = args[0];
    let options = args[1] || {};
    
    if (typeof url === "string" && url.startsWith("/api")) {
        url = apiUrl(url);
        args[0] = url;
        
        // Ensure credentials are always included for API calls
        options = {
            ...options,
            credentials: "include"
        };
        args[1] = options;
    }

    const response = await originalFetch(...args);

    // If session expired (401) and it's not the /api/me check itself, redirect to login
    if (response.status === 401 && !args[0].toString().includes("/api/me")) {
        console.warn("Session expired. Redirecting to login...");
        window.location.href = "/";
    }

    return response;
};

export { };
