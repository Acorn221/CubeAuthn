/**
 * Simple event emitter class for handling custom events
 */
export declare class EventEmitter {
    private events;
    private readonly instanceId;
    constructor();
    /**
     * Register an event listener
     * @param event - Event name
     * @param callback - Callback function
     */
    on(event: string, callback: (data: any) => void): void;
    /**
     * Remove an event listener
     * @param event - Event name
     * @param callback - Callback function to remove
     */
    off(event: string, callback: (data: any) => void): void;
    /**
     * Emit an event with data
     * @param event - Event name
     * @param data - Event data
     */
    emit(event: string, data: any): void;
    /**
     * Remove all event listeners
     */
    clearAllListeners(): void;
    /**
     * Get the instance ID for debugging
     */
    getInstanceId(): string;
}
export declare function matchUUID(uuid1: string, uuid2: string): boolean;
//# sourceMappingURL=utils.d.ts.map