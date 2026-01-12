import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    define: {
        'import.meta.env.VITE_API_URL': JSON.stringify(
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
