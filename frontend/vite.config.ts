import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    define: {
        "import.meta.env.VITE_API_URL": JSON.stringify(
            process.env.VITE_API_URL
        ),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            devOptions: {
                enabled: true, // Enable PWA in dev mode for testing
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "gstatic-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /\/api\/me/,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-user-cache",
                            expiration: {
                                maxEntries: 1,
                                maxAgeSeconds: 60 * 60, // 1 hour
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /\/api\/history/,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-history-cache",
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 5, // 5 minutes
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /\/api\/weight/,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-weight-cache",
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 5, // 5 minutes
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /\/api\/streaks/,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-streaks-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 5, // 5 minutes
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
            },
            manifest: {
                name: "Pakals Calorie Counter",
                short_name: "Pakals",
                description: "AI-Powered Calorie Counter & Progress Charts",
                theme_color: "#7c3aed",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
                orientation: "portrait",
                categories: ["health", "fitness", "lifestyle"],
                icons: [
                    {
                        src: "/logo.svg",
                        sizes: "192x192",
                        type: "image/svg+xml",
                    },
                    {
                        src: "/logo.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                    },
                    {
                        src: "/logo.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "maskable",
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ["react", "react-dom", "framer-motion"],
                    ui: [
                        "@radix-ui/react-slot",
                        "@radix-ui/react-dialog",
                        "@radix-ui/react-dropdown-menu",
                        "@radix-ui/react-tabs",
                        "lucide-react",
                        "sonner",
                        "class-variance-authority",
                        "clsx",
                        "tailwind-merge",
                    ],
                },
            },
        },
    },
});
