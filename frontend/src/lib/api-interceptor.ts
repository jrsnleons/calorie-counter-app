// Global fetch interceptor to handle session expiry
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    // If session expired (401) and it's not the /api/me check itself, redirect to login
    if (response.status === 401 && !args[0].toString().includes("/api/me")) {
        console.warn("Session expired. Redirecting to login...");
        window.location.href = "/";
    }

    return response;
};

export {};
