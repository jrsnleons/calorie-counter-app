// Force production backend URL - no environment variables, just hardcoded
const PRODUCTION_BACKEND = "https://backend-server-production-44a5.up.railway.app";
const LOCAL_BACKEND = "http://localhost:3000";

// Only use localhost if explicitly in dev mode AND running on localhost
const isLocalDev = import.meta.env.DEV && 
                   typeof window !== "undefined" && 
                   window.location.hostname === "localhost";

export const API_URL = isLocalDev ? LOCAL_BACKEND : PRODUCTION_BACKEND;

console.log('🚀 API_URL resolved to:', API_URL, 'isDev:', import.meta.env.DEV, 'hostname:', typeof window !== "undefined" ? window.location.hostname : 'N/A');

// Helper function to build API URLs
export const apiUrl = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
};
