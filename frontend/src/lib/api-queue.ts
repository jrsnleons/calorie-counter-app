
class ApiQueue {
    private queue: Promise<any> = Promise.resolve();

    /**
     * Adds an async operation to the queue.
     * The operation will only start after all previous operations have settled.
     */
    add<T>(operation: () => Promise<T>): Promise<T> {
        // We chain the new operation to the existing queue
        const nextPromise = this.queue.then(async () => {
            try {
                return await operation();
            } catch (error) {
                throw error;
            }
        });

        // Update the queue to wait for this new promise, catching errors so the queue doesn't stall
        this.queue = nextPromise.catch(() => {});

        return nextPromise;
    }
}

export const apiQueue = new ApiQueue();
