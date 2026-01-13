// Resolve API base URL with safe fallbacks so production never calls localhost
const resolveApiUrl = () => {
    // Force production backend URL
    const PRODUCTION_BACKEND = "https://backend-server-production-44a5.up.railway.app";
    
    // During local dev, use localhost
    if (import.meta.env.DEV) return "http://localhost:3000";
    
    // In production, always use the Railway backend
    return PRODUCTION_BACKEND;
};

export const API_URL = resolveApiUrl();

console.log('🚀 API_URL resolved to:', API_URL);

// Helper function to build API URLs
export const apiUrl = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
};
