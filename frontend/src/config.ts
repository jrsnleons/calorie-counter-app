// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to build API URLs
export const apiUrl = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
};
