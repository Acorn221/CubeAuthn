/// <reference types="web-bluetooth" />
import { EventEmitter } from './utils';
export declare class GanCube extends EventEmitter {
    private readonly debug;
    private props;
    private _device;
    private _gatt;
    private _service_data;
    private _service_meta;
    private _chrct_f2;
    private _chrct_f5;
    private _chrct_f6;
    private _chrct_f7;
    private _service_v2data;
    private _chrct_v2read;
    private _chrct_v2write;
    private readonly UUID_SUFFIX;
    private readonly SERVICE_UUID_META;
    private readonly CHRCT_UUID_VERSION;
    private readonly CHRCT_UUID_HARDWARE;
    private readonly SERVICE_UUID_DATA;
    private readonly CHRCT_UUID_F2;
    private readonly CHRCT_UUID_F3;
    private readonly CHRCT_UUID_F5;
    private readonly CHRCT_UUID_F6;
    private readonly CHRCT_UUID_F7;
    private readonly SERVICE_UUID_V2DATA;
    private readonly CHRCT_UUID_V2READ;
    private readonly CHRCT_UUID_V2WRITE;
    private readonly GAN_CIC_LIST;
    private decoder;
    private deviceName;
    private deviceMac;
    private readonly KEYS;
    private prevMoves;
    private timeOffs;
    private moveBuffer;
    private prevCubie;
    private curCubie;
    private latestFacelet;
    private deviceTime;
    private deviceTimeOffset;
    private moveCnt;
    private prevMoveCnt;
    private movesFromLastCheck;
    private batteryLevel;
    private keyCheck;
    constructor();
    /**
     * Gets a property value by key, or returns default if not found
     * @param key - The property key to retrieve
     * @param def - The default value to return if key not found
     * @returns The property value or default
     */
    private getProp;
    /**
     * Sets a property value
     * @param key - The property key to set
     * @param value - The value to set
     * @returns void
     */
    private setProp;
    /**
     * Generates encryption key for the cube based on version and value
     * @param version - Version number used to select the key
     * @param value - Value containing bytes to modify the key
     * @returns Generated key or undefined if key not found
     */
    private getKey;
    /**
     * Generates encryption key and initialization vector for V2 protocol
     * @param value - MAC address bytes
     * @param ver - Version number
     * @returns Array containing [key, iv]
     */
    private getKeyV2;
    /**
     * Decodes encrypted data from the cube
     * @param value - Encrypted data from the cube
     * @returns Decoded data as byte array
     */
    private decode;
    /**
     * Encodes data to send to the cube
     * @param ret - Data to encode
     * @returns Encoded data
     */
    private encode;
    /**
     * Extracts manufacturer data bytes from Bluetooth advertisement data
     * @param mfData - Manufacturer data from Bluetooth advertisement
     * @returns Manufacturer data bytes or undefined if not found
     */
    private getManufacturerDataBytes;
    /**
     * Waits for Bluetooth advertisements to extract MAC address
     * @returns Promise resolving to MAC address or rejecting with error code
     */
    private waitForAdvs;
    /**
     * Initializes encryption key for V2 protocol
     * @param forcePrompt - Whether to force prompt for MAC address
     * @param ver - Version number
     * @param providedMac - Optional MAC address provided by user
     * @returns void
     */
    private v2initKey;
    /**
     * Initializes the AES decoder with the given MAC address and version
     * @param mac - MAC address in format XX:XX:XX:XX:XX:XX
     * @param ver - Version number
     * @returns void
     */
    private v2initDecoder;
    /**
     * Sends a request to the cube using V2 protocol
     * @param req - Request data to send
     * @returns Promise from writeValue or undefined if characteristic not found
     */
    private v2sendRequest;
    /**
     * Sends a simple request with just an opcode using V2 protocol
     * @param opcode - Operation code to send
     * @returns Promise from v2sendRequest
     */
    private v2sendSimpleRequest;
    /**
     * Requests facelet state from the cube using V2 protocol
     * @returns Promise from v2sendSimpleRequest
     */
    v2requestFacelets(): Promise<void> | undefined;
    /**
     * Requests battery level from the cube using V2 protocol
     * @returns Promise from v2sendSimpleRequest
     */
    v2requestBattery(): Promise<void> | undefined;
    /**
     * Requests hardware information from the cube using V2 protocol
     * @returns Promise from v2sendSimpleRequest
     */
    v2requestHardwareInfo(): Promise<void> | undefined;
    /**
     * Requests a reset of the cube using V2 protocol
     * @returns Promise from v2sendRequest
     */
    v2requestReset(): Promise<void> | undefined;
    /**
     * Initializes the V2 protocol communication with the cube
     * @param ver - Version number
     * @param macAddress - Optional MAC address
     * @returns Promise chain for initialization
     */
    private v2init;
    /**
        * Event handler for V2 characteristic value changes
        * @param event - Bluetooth characteristic value changed event
        * @returns void
        */
    private onStateChangedV2;
    /**
        * Parses data received from the cube using V2 protocol
        * @param value - Raw data from the cube
        * @returns void
        */
    private parseV2Data;
    /**
        * Updates move times and processes cube moves
        * @param locTime - Local timestamp in milliseconds
        * @param isV2 - Whether using V2 protocol
        * @returns void
        */
    private updateMoveTimes;
    /**
        * Initializes the cube state and notifies the callback
        * @returns void
        */
    private initCubeState;
    /**
        * Clears all cube connections and resets state
        * @returns Promise that resolves when cleanup is complete
        */
    clear(): Promise<void>;
    /**
        * Initializes communication with the GAN cube
        * @param device - Bluetooth device object
        * @param macAddress - Optional MAC address
        * @returns Promise chain for initialization
        */
    init(device: BluetoothDevice, macAddress?: string): Promise<void>;
    /**
        * Checks the current state of the cube by reading facelet data
        * @returns Promise resolving to true if state was updated, false otherwise
        */
    private checkState;
    /**
        * Continuously reads cube state and processes moves
        * @returns Promise chain for reading or undefined if device not connected
        */
    private loopRead;
    /**
        * Gets the current battery level of the cube
        * @returns Promise resolving to [batteryLevel, deviceName]
        */
    getBatteryLevel(): Promise<[number, string]>;
    /**
        * Logs the current state of the cube to the console
        * This function can be called at any time to get the current state of the cube
        * without having to wait for a move to be made.
        *
        * Usage example:
        * ```
        * // Log the current cube state
        * ganCube.logCubeState();
        *
        * // Or listen for cube state changes
        * window.addEventListener('cubeStateChanged', (event) => {
        *   console.log('Cube state changed:', event.detail);
        * });
        * ```
        *
        * @returns Object containing facelet representation and corner/edge arrays
        */
    logCubeState(): {
        facelet: string;
        corners: number[];
        edges: number[];
    };
    /**
        * Get the list of operation service UUIDs
        * @returns Array of service UUIDs
        */
    get opservs(): string[];
    /**
        * Get the list of Company Identifier Codes
        * @returns Array of CIC values
        */
    get cics(): number[];
}
//# sourceMappingURL=gancube.d.ts.map