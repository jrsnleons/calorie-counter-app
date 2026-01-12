// Resolve API base URL with safe fallbacks so production never calls localhost
const resolveApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) return envUrl.replace(/\/$/, "");

    // During local dev, default to the local backend
    if (import.meta.env.DEV) return "http://localhost:3000";

    // In production, fall back to current origin to avoid hitting localhost
    if (typeof window !== "undefined") return window.location.origin;

    return "http://localhost:3000";
};

export const API_URL = resolveApiUrl();

// Helper function to build API URLs
export const apiUrl = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
};
