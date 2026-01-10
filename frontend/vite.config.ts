import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            devOptions: {
                enabled: true, // Enable PWA in dev mode for testing
            },
            manifest: {
                name: "Pakals Calorie Counter",
                short_name: "Pakals",
                description: "AI-Powered Calorie Counter",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
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
});
