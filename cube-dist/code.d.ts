import { GanCube } from './gancube';
import { EventEmitter } from './utils';
/**
 * BTCube class for connecting to and interacting with Bluetooth cubes
 */
export declare class BTCube extends EventEmitter {
    private cube;
    private device;
    private callback;
    private evtCallback;
    private readonly DEBUG;
    constructor(debug?: boolean);
    /**
     * Handles hardware events from the cube
     * @param {string} info - Event information (e.g., 'disconnect')
     * @param {Event} event - The event object
     * @returns {Promise} Promise that resolves after handling the event
     */
    private onHardwareEvent;
    /**
     * Initializes connection to a Bluetooth cube
     * @param {string} macAddress - Optional MAC address of the cube
     * @returns {Promise} Promise that resolves when cube is connected
     */
    init(macAddress?: string): Promise<any>;
    /**
     * Stops the connection to the cube
     * @returns {Promise} Promise that resolves when disconnection is complete
     */
    stop(): Promise<void>;
    /**
     * Checks if the cube is connected
     * @returns {boolean} True if connected
     */
    isConnected(): boolean;
    /**
     * Sets the callback function for cube state changes
     * @param {Function} func - Callback function
     */
    setCallback(func: (state: string, moves: string[], timestamps: [number | null, number | null], deviceName: string) => void): void;
    /**
     * Sets the callback function for cube events
     * @param {Function} func - Event callback function
     */
    setEventCallback(func: (info: string, event: Event) => void): void;
    /**
     * Gets the cube instance
     * @returns Cube instance
     */
    getCube(): GanCube | null;
    /**
     * Sets up event forwarding from the GanCube instance to this BTCube instance
     * This allows components to listen to events from the BTCube instance
     * instead of from the window object
     */
    private setupEventForwarding;
}
//# sourceMappingURL=code.d.ts.map