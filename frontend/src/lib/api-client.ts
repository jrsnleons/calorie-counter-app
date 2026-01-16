export const apiUrl = (path: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    // If path starts with /, join it carefully
    if (baseUrl && !baseUrl.endsWith('/') && path.startsWith('/')) {
        return `${baseUrl}${path}`;
    }
    return `${baseUrl}${path}`;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const fullUrl = apiUrl(url);
    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies/session
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    const response = await fetch(fullUrl, finalOptions);

    if (response.status === 401 && !url.includes('/api/me')) {
        // Handle session expiry globally
        // We can despatch a custom event or just let the calling component handle it
        // Ideally, returns null or throws, but let's just return response for now
        // and let logic handle it.
        // Or we can emit an event window.dispatchEvent(new Event('auth:logout'));
    }

    return response;
};
