// types.ts
export interface BaseMessage {
  messageType: string;
  messageId: string;
  payload: any;
}

/**
 * Base type for defining message request/response pairs.
 * Each key represents a message type with its corresponding request and response types.
 * 
 * @example
 * ```typescript
 * interface MyInboundMessages extends MessageDefinitions {
 *   auth: {
 *     request: { token: string };
 *     response: { success: boolean; user?: User };
 *   };
 *   getData: {
 *     request: { id: string };
 *     response: { data: any[] };
 *   };
 * }
 * 
 * interface MyOutboundMessages extends MessageDefinitions {
 *   updateSettings: {
 *     request: { theme: 'dark' | 'light' };
 *     response: { applied: boolean };
 *   };
 * }
 * ```
 */
export type MessageDefinitions = Record<string, {
  request: any;
  response: any;
}>;

/**
 * Options for targeting specific connections when sending messages.
 * Multiple criteria can be combined for more specific targeting.
 */
export type TargetOptions = 
  | { tabId: number; url?: string }
  | { url: string; tabId?: number }
  | { urlPattern: string }
  | { portName: string }
  | {}; // broadcast

/**
 * Information about an active port connection.
 */
export interface ConnectionInfo {
  /** Unique identifier for this connection */
  id: string;
  /** Chrome tab ID if available */
  tabId?: number;
  /** Full URL of the connected page if available */
  url?: string;
  /** Timestamp when the connection was established */
  connectedAt: Date;
}

/**
 * Configuration options for PortManager.
 */
export interface PortManagerConfig {
  /** Whether to accept connections from other extensions (default: false) */
  allowExternalConnections?: boolean;
  /** Message timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Handler function for incoming messages.
 * Can return a response synchronously or asynchronously.
 */
export type MessageHandler<TRequest = any, TResponse = any> = (
  payload: TRequest,
  connectionInfo: ConnectionInfo
) => TResponse | Promise<TResponse>;

// port-manager.ts
export class PortManager<
  TInbound extends MessageDefinitions = MessageDefinitions,
  TOutbound extends MessageDefinitions = MessageDefinitions
> {
  private connections = new Map<string, PortConnection>();
  private config: Required<PortManagerConfig>;
  private connectionListeners: Array<(connection: ConnectionInfo) => void> = [];
  private messageHandlers = new Map<string, MessageHandler>();

  /**
   * Creates a new PortManager instance for managing Chrome extension port communications.
   * 
   * @param config - Configuration options
   * @param config.allowExternalConnections - Whether to accept connections from other extensions (default: false)
   * @param config.timeout - Message timeout in milliseconds (default: 10000)
   * 
   * @example
   * ```typescript
   * const ports = new PortManager<InboundMessages, OutboundMessages>({
   *   timeout: 5000,
   *   allowExternalConnections: false
   * });
   * ```
   */
  constructor(config: PortManagerConfig = {}) {
    this.config = {
      allowExternalConnections: false,
      timeout: 10000,
      ...config
    };

    this.setupPortListener();
  }

  /**
   * Registers a handler for incoming messages of a specific type.
   * 
   * @param messageType - The type of message to handle (must be a key of your inbound message definitions)
   * @param handler - Function to handle the message and optionally return a response
   * @returns Unsubscribe function to remove the handler
   * 
   * @example
   * ```typescript
   * // Handle auth messages
   * const unsubscribe = ports.registerHandler('auth', async (payload, connectionInfo) => {
   *   const isValid = await validateToken(payload.token);
   *   return { success: isValid, user: isValid ? await getUser(payload.token) : undefined };
   * });
   * 
   * // Handle simple messages without response
   * ports.registerHandler('ping', (payload) => {
   *   console.log('Received ping from', connectionInfo.url);
   *   return { pong: true };
   * });
   * 
   * // Later, to stop handling
   * unsubscribe();
   * ```
   */
  registerHandler<K extends keyof TInbound>(
    messageType: K,
    handler: MessageHandler<TInbound[K]['request'], TInbound[K]['response']>
  ): () => void {
    this.messageHandlers.set(messageType as string, handler);
    
    return () => {
      this.messageHandlers.delete(messageType as string);
    };
  }

  /**
   * Removes a registered message handler.
   * 
   * @param messageType - The type of message handler to remove
   * 
   * @example
   * ```typescript
   * ports.unregisterHandler('auth');
   * ```
   */
  unregisterHandler<K extends keyof TInbound>(messageType: K): void {
    this.messageHandlers.delete(messageType as string);
  }

  /**
   * Sends a message to a specific target.
   * 
   * @param messageType - The type of message to send (must be a key of your outbound message definitions)
   * @param payload - The message payload matching the request type for this message
   * @returns A MessageBuilder instance for specifying the target
   * 
   * @example
   * ```typescript
   * // Fire and forget
   * ports.send('updateSettings', { theme: 'dark' }).to({ tabId: 123 });
   * 
   * // Await response
   * const result = await ports.send('getData', { id: '123' }).to({ tabId: 123 }, true);
   * ```
   */
  send<K extends keyof TOutbound>(
    messageType: K,
    payload: TOutbound[K]['request']
  ): MessageBuilder<TOutbound, K> {
    return new MessageBuilder(this, messageType, payload);
  }

  /**
   * Broadcasts a message to all connected ports.
   * 
   * @param messageType - The type of message to broadcast
   * @param payload - The message payload
   * @throws {Error} If no connections are available and throwIfNoMessages is true
   * 
   * @example
   * ```typescript
   * ports.broadcast('updateSettings', { theme: 'dark' });
   * 
   * // Throws error if there are no connections
   * ports.broadcast('updateSettings', { theme: 'dark' }, true);
   * ```
   */
  broadcast<K extends keyof TOutbound>(
    messageType: K,
    payload: TOutbound[K]['request'],
    throwIfNoMessages: boolean = false
  ): void {
    if(throwIfNoMessages) {
      this.sendToTarget({}, messageType, payload);
    } else {
      this.sendToTarget({}, messageType, payload).catch(() => {});
    }
  }

  /**
   * Gets information about active connections.
   * 
   * @param filter - Optional filter to match specific connections
   * @returns Array of connection information objects
   * 
   * @example
   * ```typescript
   * // Get all connections
   * const all = ports.getConnections();
   * 
   * // Get connections for a specific URL pattern
   * const github = ports.getConnections({ urlPattern: 'github.com' });
   * 
   * // Get connections for a specific tab
   * const tab = ports.getConnections({ tabId: 123 });
   * ```
   */
  getConnections(filter?: Partial<TargetOptions>): ConnectionInfo[] {
    const connections = Array.from(this.connections.values());
    
    if (!filter || Object.keys(filter).length === 0) {
      return connections.map(c => c.getInfo());
    }

    return connections
      .filter(conn => this.matchesFilter(conn, filter))
      .map(c => c.getInfo());
  }

  /**
   * Registers a listener for new port connections.
   * 
   * @param listener - Callback function that receives connection info when a new port connects
   * @returns Unsubscribe function to remove the listener
   * 
   * @example
   * ```typescript
   * const unsubscribe = ports.onConnect((connection) => {
   *   console.log(`New connection from tab ${connection.tabId}`);
   * });
   * 
   * // Later, to stop listening
   * unsubscribe();
   * ```
   */
  onConnect(listener: (connection: ConnectionInfo) => void): () => void {
    this.connectionListeners.push(listener);
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) this.connectionListeners.splice(index, 1);
    };
  }

  /**
   * Disconnects a specific connection.
   * 
   * @param connectionId - The ID of the connection to disconnect
   * 
   * @example
   * ```typescript
   * const connections = ports.getConnections();
   * if (connections.length > 0) {
   *   ports.disconnect(connections[0].id);
   * }
   * ```
   */
  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(connectionId);
    }
  }

  // Internal methods
  private setupPortListener() {
    chrome.runtime.onConnect.addListener((port) => {
      // Check if we should accept this connection
      if (!this.config.allowExternalConnections && port.sender?.id !== chrome.runtime.id) {
        port.disconnect();
        return;
      }

      const connection = new PortConnection(port, this.config.timeout, this.messageHandlers);
      this.connections.set(connection.id, connection);

      // Get connection info
      connection.initialize().then(() => {
        this.connectionListeners.forEach(listener => {
          listener(connection.getInfo());
        });
      });

      // Clean up on disconnect
      port.onDisconnect.addListener(() => {
        this.connections.delete(connection.id);
      });
    });
  }

  private matchesFilter(conn: PortConnection, filter: Partial<TargetOptions>): boolean {
    if ('tabId' in filter && filter.tabId !== conn.tabId) return false;
    if ('url' in filter && filter.url !== conn.url) return false;
    if ('urlPattern' in filter && filter.urlPattern && !conn.url?.includes(filter.urlPattern)) return false;
    if ('portName' in filter && filter.portName !== conn.portName) return false;
    return true;
  }

  // Internal send method
  async sendToTarget<K extends keyof TOutbound>(
    target: TargetOptions,
    messageType: K,
    payload: TOutbound[K]['request'],
    awaitResponse?: boolean
  ): Promise<TOutbound[K]['response'] | void> {
    const matchingConnections = this.getMatchingConnections(target);

    if (matchingConnections.length === 0) {
      throw new Error(`No connections found for target: ${JSON.stringify(target)}`);
    }

    if (awaitResponse) {
      if (matchingConnections.length > 1) {
        throw new Error('Cannot await response from multiple connections');
      }
      return matchingConnections[0].sendMessage(messageType as string, payload, true);
    } else {
      // Fire and forget - send to all matching connections
      const errors: Error[] = [];
      
      await Promise.all(
        matchingConnections.map(conn =>
          conn.sendMessage(messageType as string, payload, false)
            .catch(error => errors.push(error))
        )
      );

      if (errors.length === matchingConnections.length) {
        // All sends failed
        throw new Error(`Failed to send message to any connection: ${errors[0].message}`);
      }
    }
  }

  private getMatchingConnections(target: TargetOptions): PortConnection[] {
    const connections = Array.from(this.connections.values());
    
    if (Object.keys(target).length === 0) {
      return connections; // broadcast
    }

    return connections.filter(conn => this.matchesFilter(conn, target));
  }
}

// Fluent message builder
class MessageBuilder<T extends MessageDefinitions, K extends keyof T> {
  constructor(
    private manager: PortManager<any, T>,
    private messageType: K,
    private payload: T[K]['request']
  ) {}

  /**
   * Specifies the target for this message.
   * 
   * @param target - Target options for where to send the message
   * @param awaitResponse - If true, returns a promise for the response
   * @returns void for fire-and-forget, or Promise for awaited responses
   * 
   * @example
   * ```typescript
   * // Fire and forget
   * ports.send('update', { data: 'value' }).to({ tabId: 123 });
   * 
   * // Await response
   * const result = await ports.send('query', { id: '123' }).to({ tabId: 123 }, true);
   * ```
   */
  to(target: TargetOptions): void;
  to(target: TargetOptions, awaitResponse: true): Promise<T[K]['response']>;
  to(target: TargetOptions, awaitResponse?: boolean): void | Promise<T[K]['response']> {
    if (awaitResponse) {
      return this.manager['sendToTarget'](target, this.messageType, this.payload, true) as Promise<T[K]['response']>;
    } else {
      this.manager['sendToTarget'](target, this.messageType, this.payload, false);
    }
  }
}

// Internal connection wrapper
class PortConnection {
  readonly id: string;
  tabId?: number;
  url?: string;
  portName: string;
  private port: chrome.runtime.Port;
  private pendingMessages = new Map<string, PendingMessage>();
  private connectedAt: Date;

  constructor(
    port: chrome.runtime.Port, 
    private timeout: number,
    private messageHandlers: Map<string, MessageHandler>
  ) {
    this.id = crypto.randomUUID();
    this.port = port;
    this.portName = port.name || this.id;
    this.connectedAt = new Date();
    this.setupMessageHandler();
  }

  async initialize(): Promise<void> {
    try {
      const info = await this.sendMessage('getUrlAndTab', {}, true) as { url: string; tabId: number };
      this.url = info.url;
      this.tabId = info.tabId;
    } catch (error) {
      console.warn('Failed to get connection info:', error);
    }
  }

  getInfo(): ConnectionInfo {
    return {
      id: this.id,
      tabId: this.tabId,
      url: this.url,
      connectedAt: this.connectedAt
    };
  }

  disconnect(): void {
    this.port.disconnect();
  }

  async sendMessage(messageType: string, payload: any, awaitResponse: boolean): Promise<any> {
    const messageId = crypto.randomUUID();
    const message = { messageType, messageId, payload };

    if (!awaitResponse) {
      this.port.postMessage(message);
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Message timeout: ${messageType}`));
      }, this.timeout);

      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timeoutId
      });

      this.port.postMessage(message);
    });
  }

  private setupMessageHandler() {
    this.port.onMessage.addListener(async (msg: any) => {
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
        const response = await handler(msg.payload, this.getInfo());
        
        // Send the response back
        this.port.postMessage({
          messageType: msg.messageType,
          messageId: msg.messageId,
          payload: response
        });
      } catch (error) {
        console.error(`Error handling message ${msg.messageType}:`, error);
        
        // Send error response
        this.port.postMessage({
          messageType: msg.messageType,
          messageId: msg.messageId,
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    this.port.onDisconnect.addListener(() => {
      // Reject all pending messages
      this.pendingMessages.forEach(pending => {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('Port disconnected'));
      });
      this.pendingMessages.clear();
    });
  }
}

interface PendingMessage {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

// Usage examples:
/*
// Define your inbound and outbound messages separately
interface InboundMessages extends MessageDefinitions {
  auth: {
    request: { token: string };
    response: { success: boolean; user?: string };
  };
  getData: {
    request: { id: string };
    response: { data: string[] };
  };
  ping: {
    request: {};
    response: { pong: boolean };
  };
}

interface OutboundMessages extends MessageDefinitions {
  updateSettings: {
    request: { theme: 'dark' | 'light' };
    response: { applied: boolean };
  };
  notify: {
    request: { message: string; type: 'info' | 'error' };
    response: { acknowledged: boolean };
  };
}

// Create manager with separate inbound/outbound types
const ports = new PortManager<InboundMessages, OutboundMessages>({
  timeout: 5000
});

// Register handlers for incoming messages
const unsubscribeAuth = ports.registerHandler('auth', async (payload, connectionInfo) => {
  console.log(`Auth request from ${connectionInfo.url}`);
  const isValid = payload.token === 'valid-token';
  return { 
    success: isValid, 
    user: isValid ? 'john-doe' : undefined 
  };
});

const unsubscribePing = ports.registerHandler('ping', (payload, connectionInfo) => {
  console.log(`Ping from tab ${connectionInfo.tabId}`);
  return { pong: true };
});

const unsubscribeGetData = ports.registerHandler('getData', async (payload) => {
  // Simple mock data based on ID
  const mockData = ['item1', 'item2', 'item3'];
  return { data: mockData };
});

// Send outbound messages (typed to OutboundMessages)
try {
  ports.send('updateSettings', { theme: 'dark' }).to({ tabId: 123 });
} catch (error) {
  console.error('Failed to send:', error);
}

// Await response from outbound message
try {
  const notifyResult = await ports.send('notify', { 
    message: 'Settings updated', 
    type: 'info' 
  }).to({ tabId: 123 }, true);
  
  console.log('Notification acknowledged:', notifyResult.acknowledged);
} catch (error) {
  console.error('Notification failed:', error);
}

// Broadcast outbound message
ports.broadcast('notify', { message: 'System maintenance', type: 'info' });

// Clean up handlers when done
unsubscribeAuth();
unsubscribePing();
unsubscribeGetData();
*/