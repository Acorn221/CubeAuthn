// port-client.ts

// Import the shared types from your types file
// These imports should match your project structure
import type { 
  BaseMessage, 
  MessageDefinitions, 
  ConnectionInfo 
} from '@/background/port-messaging-api'; // Adjust this import path to match your project

/**
 * Handler function for incoming messages on the client side.
 * Can return a response synchronously or asynchronously.
 */
export type ClientMessageHandler<TRequest = any, TResponse = any> = (
  payload: TRequest
) => TResponse | Promise<TResponse>;

/**
 * Configuration options for PortClient.
 */
export interface PortClientConfig {
  /** Custom name for the port connection */
  portName?: string;
  /** Message timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Whether to automatically reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Delay before reconnecting in milliseconds (default: 1000) */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
}

/**
 * Client-side port manager for content scripts and other extension contexts.
 * Provides a clean API for bidirectional communication with the background script.
 * 
 * @example
 * ```typescript
 * // Define message types (inverse of background script)
 * interface InboundMessages extends MessageDefinitions {
 *   updateSettings: {
 *     request: { theme: 'dark' | 'light' };
 *     response: { applied: boolean };
 *   };
 *   notify: {
 *     request: { message: string; type: 'info' | 'error' };
 *     response: { acknowledged: boolean };
 *   };
 * }
 * 
 * interface OutboundMessages extends MessageDefinitions {
 *   auth: {
 *     request: { token: string };
 *     response: { success: boolean; user?: string };
 *   };
 *   getData: {
 *     request: { id: string };
 *     response: { data: string[] };
 *   };
 * }
 * 
 * // Create client
 * const client = new PortClient<InboundMessages, OutboundMessages>({
 *   portName: 'content-script',
 *   autoReconnect: true
 * });
 * 
 * // Connect to background
 * await client.connect();
 * ```
 */
export class PortClient<
  TInbound extends MessageDefinitions = MessageDefinitions,
  TOutbound extends MessageDefinitions = MessageDefinitions
> {
  private port?: chrome.runtime.Port;
  private config: Required<PortClientConfig>;
  private messageHandlers = new Map<keyof TInbound, ClientMessageHandler>();
  private pendingMessages = new Map<keyof TOutbound, PendingMessage>();
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private connected = false;
  private connectionInfo?: ConnectionInfo;

  /**
   * Creates a new PortClient instance for content script communication.
   * 
   * @param config - Configuration options
   */
  constructor(config: PortClientConfig = {}) {
    this.config = {
      portName: `content-script-${Date.now()}`,
      timeout: 10000,
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      ...config
    };
  }

  /**
   * Establishes a connection to the background script.
   * 
   * @returns Promise that resolves when connected
   * @throws {Error} If connection fails
   * 
   * @example
   * ```typescript
   * try {
   *   await client.connect();
   *   console.log('Connected to background script');
   * } catch (error) {
   *   console.error('Failed to connect:', error);
   * }
   * ```
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.port = chrome.runtime.connect({ name: this.config.portName });
      this.setupPortHandlers();
      
      // Send connection info
      await this.sendConnectionInfo();
      
      this.connected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnects from the background script.
   * 
   * @example
   * ```typescript
   * client.disconnect();
   * ```
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.port) {
      this.port.disconnect();
      this.port = undefined;
    }

    this.connected = false;
    this.notifyConnectionListeners(false);
    
    // Reject all pending messages
    this.pendingMessages.forEach(pending => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Client disconnected'));
    });
    this.pendingMessages.clear();
  }

  /**
   * Checks if the client is currently connected.
   * 
   * @returns true if connected, false otherwise
   * 
   * @example
   * ```typescript
   * if (client.isConnected()) {
   *   // Safe to send messages
   * }
   * ```
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Registers a handler for incoming messages of a specific type.
   * 
   * @param messageType - The type of message to handle
   * @param handler - Function to handle the message and optionally return a response
   * @returns Unsubscribe function to remove the handler
   * 
   * @example
   * ```typescript
   * // Handle settings update
   * const unsubscribe = client.on('updateSettings', async (payload) => {
   *   document.body.className = payload.theme;
   *   return { applied: true };
   * });
   * 
   * // Handle notifications
   * client.on('notify', (payload) => {
   *   console.log(`${payload.type}: ${payload.message}`);
   *   return { acknowledged: true };
   * });
   * ```
   */
  on<K extends keyof TInbound>(
    messageType: K,
    handler: ClientMessageHandler<TInbound[K]['request'], TInbound[K]['response']>
  ): () => void {
    this.messageHandlers.set(messageType, handler);
    
    return () => {
      this.messageHandlers.delete(messageType);
    };
  }

  /**
   * Removes a registered message handler.
   * 
   * @param messageType - The type of message handler to remove
   * 
   * @example
   * ```typescript
   * client.off('updateSettings');
   * ```
   */
  off<K extends keyof TInbound>(messageType: K): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Sends a message to the background script and optionally waits for a response.
   * 
   * @param messageType - The type of message to send
   * @param payload - The message payload
   * @returns Promise resolving to the response if awaited
   * @throws {Error} If not connected or if the message times out
   * 
   * @example
   * ```typescript
   * // Fire and forget
   * client.send('ping', {});
   * 
   * // Await response
   * const result = await client.send('auth', { token: 'my-token' });
   * if (result.success) {
   *   console.log('Authenticated as:', result.user);
   * }
   * 
   * // With error handling
   * try {
   *   const data = await client.send('getData', { id: '123' });
   *   console.log('Received data:', data);
   * } catch (error) {
   *   console.error('Request failed:', error);
   * }
   * ```
   */
  send<K extends keyof TOutbound>(
    messageType: K,
    payload: TOutbound[K]['request']
  ): Promise<TOutbound[K]['response']>;
  send<K extends keyof TOutbound>(
    messageType: K,
    payload: TOutbound[K]['request'],
    awaitResponse: false
  ): void;
  send<K extends keyof TOutbound>(
    messageType: K,
    payload: TOutbound[K]['request'],
    awaitResponse: boolean = true
  ): Promise<TOutbound[K]['response']> | void {

    if(typeof messageType !== 'string') {
      throw new Error(`Invalid message type: ${typeof messageType}`);
    }
    if (!this.connected || !this.port) {
      throw new Error('Not connected to background script');
    }

    const messageId = crypto.randomUUID();
    const message: BaseMessage = { messageType: messageType, messageId, payload };

    if (!awaitResponse) {
      this.port.postMessage(message);
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Message timeout: ${messageType}`));
      }, this.config.timeout);

      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timeoutId
      });

      this.port!.postMessage(message);
    });
  }

  /**
   * Registers a listener for connection state changes.
   * 
   * @param listener - Callback function that receives the connection state
   * @returns Unsubscribe function to remove the listener
   * 
   * @example
   * ```typescript
   * const unsubscribe = client.onConnectionChange((connected) => {
   *   console.log(connected ? 'Connected' : 'Disconnected');
   *   
   *   if (connected) {
   *     // Re-initialize after reconnection
   *   }
   * });
   * ```
   */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);
    
    // Immediately notify of current state
    listener(this.connected);
    
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) this.connectionListeners.splice(index, 1);
    };
  }

  /**
   * Gets information about the current connection.
   * 
   * @returns Connection info if connected, undefined otherwise
   * 
   * @example
   * ```typescript
   * const info = client.getConnectionInfo();
   * if (info) {
   *   console.log(`Connected since: ${info.connectedAt}`);
   * }
   * ```
   */
  getConnectionInfo(): ConnectionInfo | undefined {
    return this.connectionInfo;
  }

  // Private methods
  private setupPortHandlers(): void {
    if (!this.port) return;

    this.port.onMessage.addListener(async (msg: BaseMessage) => {
      if (!msg.messageId || !msg.messageType) return;

      // Check if this is a response to a pending message
      const pending = this.pendingMessages.get(msg.messageId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingMessages.delete(msg.messageId);
        pending.resolve(msg.payload);
        return;
      }

      // Check if we have a handler for this message type
      const handler = this.messageHandlers.get(msg.messageType);
      if (!handler) {
        console.warn(`No handler registered for message type: ${msg.messageType}`);
        return;
      }

      try {
        // Call the handler and get the response
        const response = await handler(msg.payload);
        
        // Send the response back
        this.port!.postMessage({
          messageType: msg.messageType,
          messageId: msg.messageId,
          payload: response
        });
      } catch (error) {
        console.error(`Error handling message ${msg.messageType}:`, error);
        
        // Send error response
        this.port!.postMessage({
          messageType: msg.messageType,
          messageId: msg.messageId,
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    this.port.onDisconnect.addListener(() => {
      this.handleDisconnect();
    });
  }

  private async sendConnectionInfo(): Promise<void> {
    // Register a one-time handler for the connection info request
    const cleanup = this.on('getUrlAndTab' as any, () => {
      return {
        url: window.location.href,
        tabId: chrome.devtools?.inspectedWindow?.tabId || undefined
      };
    });

    // Store our own connection info
    this.connectionInfo = {
      id: crypto.randomUUID(),
      url: window.location.href,
      tabId: chrome.devtools?.inspectedWindow?.tabId,
      connectedAt: new Date()
    };

    // Clean up the handler after a short delay
    setTimeout(cleanup, 100);
  }

  private handleDisconnect(): void {
    const wasConnected = this.connected;
    this.connected = false;
    this.port = undefined;

    if (wasConnected) {
      this.notifyConnectionListeners(false);
    }

    // Reject all pending messages
    this.pendingMessages.forEach(pending => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Port disconnected'));
    });
    this.pendingMessages.clear();

    // Attempt to reconnect if configured
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }
}

interface PendingMessage {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/**
 * Helper function to create a typed port client with less boilerplate.
 * 
 * @example
 * ```typescript
 * const client = createPortClient<InboundMessages, OutboundMessages>({
 *   portName: 'my-content-script'
 * });
 * ```
 */
export function createPortClient<
  TInbound extends MessageDefinitions,
  TOutbound extends MessageDefinitions
>(config?: PortClientConfig): PortClient<TInbound, TOutbound> {
  return new PortClient<TInbound, TOutbound>(config);
}