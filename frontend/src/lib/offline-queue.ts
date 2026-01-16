import type { OfflineAction } from "@/types";

const OFFLINE_QUEUE_KEY = "pakals_offline_queue";

class OfflineQueueManager {
    private queue: OfflineAction[] = [];

    constructor() {
        this.loadFromStorage();
        this.setupOnlineListener();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load offline queue", e);
            this.queue = [];
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error("Failed to save offline queue", e);
        }
    }

    private setupOnlineListener() {
        window.addEventListener("online", () => {
            console.log("Back online, syncing...");
            this.sync();
        });
    }

    isOnline(): boolean {
        return navigator.onLine;
    }

    addAction(type: OfflineAction["type"], payload: any) {
        const action: OfflineAction = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            payload,
            timestamp: Date.now(),
        };
        this.queue.push(action);
        this.saveToStorage();
        console.log("Added offline action:", action);
        return action;
    }

    getQueue(): OfflineAction[] {
        return [...this.queue];
    }

    getPendingCount(): number {
        return this.queue.length;
    }

    async sync(): Promise<{
        success: boolean;
        synced: number;
        errors: number;
    }> {
        if (!this.isOnline() || this.queue.length === 0) {
            return { success: true, synced: 0, errors: 0 };
        }

        try {
            const actionsToSync = [...this.queue];
            const response = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actions: actionsToSync }),
            });

            if (response.ok) {
                const data = await response.json();
                // Remove synced actions
                const syncedIds = new Set(
                    data.results
                        .filter((r: any) => r.success)
                        .map((r: any) => r.id)
                );
                this.queue = this.queue.filter((a) => !syncedIds.has(a.id));
                this.saveToStorage();

                const synced = syncedIds.size;
                const errors = data.results.length - synced;
                return { success: true, synced, errors };
            } else {
                return { success: false, synced: 0, errors: this.queue.length };
            }
        } catch (e) {
            console.error("Sync failed:", e);
            return { success: false, synced: 0, errors: this.queue.length };
        }
    }

    clearQueue() {
        this.queue = [];
        this.saveToStorage();
    }
}

export const offlineQueue = new OfflineQueueManager();

// Hook for React components
import { useEffect, useState } from "react";

export function useOfflineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(
        offlineQueue.getPendingCount()
    );

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Auto-sync when coming back online
            offlineQueue.sync().then(() => {
                setPendingCount(offlineQueue.getPendingCount());
            });
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const refreshPendingCount = () => {
        setPendingCount(offlineQueue.getPendingCount());
    };

    return { isOnline, pendingCount, refreshPendingCount };
}
