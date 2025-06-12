import { useEffect, useState, useCallback } from 'react';
import type { InboundMessages, OutboundMessages } from "@/background/types";
import { PortClient as PortClientRaw, type ClientMessageHandler } from "./port-messaging-cs-api";
import type { ConnectionInfo } from "@/background/port-messaging-api";

// @ts-expect-error Error here - not sure why!
type PortClient = PortClientRaw<InboundMessages, OutboundMessages>

// Configuration options for the port client
export interface PortClientConfig {
  portName?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
}

// Default configuration
const DEFAULT_CONFIG: Required<PortClientConfig> = {
  portName: undefined,
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  timeout: 10000,
};

// Singleton instance of the port client
let portClientInstance: PortClient | null = null;
let clientConfig: Required<PortClientConfig> = DEFAULT_CONFIG;
let isConnecting = false;
let connectionError: Error | null = null;
let connectionListeners: Array<(client: PortClient | null, error: Error | null) => void> = [];

/**
 * Initialize the port client with the given configuration
 */
export async function initPortClient(config: PortClientConfig = {}): Promise<PortClient> {
  // Merge with default config
  clientConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  // If already connecting, wait for it to complete
  if (isConnecting) {
    return new Promise((resolve, reject) => {
      const checkClient = () => {
        if (portClientInstance) {
          resolve(portClientInstance);
        } else if (connectionError) {
          reject(connectionError);
        } else {
          setTimeout(checkClient, 100);
        }
      };
      checkClient();
    });
  }

  // If already initialized, return the instance
  if (portClientInstance) {
    return portClientInstance;
  }

  try {
    isConnecting = true;
    connectionError = null;
    notifyConnectionListeners();
    
    // @ts-expect-error Create client with separate inbound/outbound types
    const portClient = new PortClientRaw<InboundMessages, OutboundMessages>(clientConfig);
    
    await portClient.connect();
    portClientInstance = portClient;
    notifyConnectionListeners();
    return portClient;
  } catch (err) {
    connectionError = err instanceof Error ? err : new Error('Failed to connect to background script');
    console.error('Port client connection error:', err);
    notifyConnectionListeners();
    throw connectionError;
  } finally {
    isConnecting = false;
  }
}

/**
 * Get the current port client instance
 * Will throw if not initialized
 */
export function getPortClient(): PortClient {
  if (!portClientInstance) {
    throw new Error('Port client not initialized. Call initPortClient() first.');
  }
  return portClientInstance;
}

/**
 * Disconnect the port client
 */
export function disconnectPortClient(): void {
  if (portClientInstance) {
    portClientInstance.disconnect();
    portClientInstance = null;
    notifyConnectionListeners();
  }
}

/**
 * Register a listener for port client connection changes
 */
export function onPortClientChange(
  listener: (client: PortClient | null, error: Error | null) => void
): () => void {
  connectionListeners.push(listener);
  
  // Immediately notify of current state
  listener(portClientInstance, connectionError);
  
  return () => {
    const index = connectionListeners.indexOf(listener);
    if (index > -1) connectionListeners.splice(index, 1);
  };
}

// Notify all connection listeners
function notifyConnectionListeners(): void {
  connectionListeners.forEach(listener => {
    try {
      listener(portClientInstance, connectionError);
    } catch (error) {
      console.error('Error in connection listener:', error);
    }
  });
}

/**
 * Hook to use the port client
 * Automatically initializes the client if not already initialized
 */
export function usePortClient(config: PortClientConfig = {}): {
  client: PortClient | null;
  isConnecting: boolean;
  error: Error | null;
} {
  const [state, setState] = useState({
    client: portClientInstance,
    isConnecting,
    error: connectionError
  });

  useEffect(() => {
    // Initialize the client if not already initialized
    if (!portClientInstance && !isConnecting) {
      initPortClient(config).catch(() => {});
    }

    // Subscribe to connection changes
    const unsubscribe = onPortClientChange((client, error) => {
      setState({
        client,
        isConnecting,
        error
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Hook to send messages
 */
export function useSendMessage<K extends keyof InboundMessages>(
  messageType: K
) {
  const { client } = usePortClient();
  
  return useCallback(
    (payload: InboundMessages[K]['request'], awaitResponse: boolean = true) => {
      if (!client) {
        throw new Error('Port client not initialized');
      }

      if (awaitResponse) {
        // @ts-expect-error bruh
        return client.send(messageType, payload) as Promise<InboundMessages[K]['response']>;
      } else {
        // @ts-expect-error bruh
        client.send(messageType, payload, false);
      }
    },
    [client, messageType]
  );
}

/**
 * Hook to register a message handler
 */
export function useMessageHandler<K extends keyof OutboundMessages>(
  messageType: K,
  handler: ClientMessageHandler<OutboundMessages[K]['request'], OutboundMessages[K]['response']>,
  deps: React.DependencyList = []
) {
  const { client } = usePortClient();
  
  useEffect(() => {
    if (!client) return;

    // @ts-expect-error bruh
    const unsubscribe = client.on(messageType, handler);
    return unsubscribe;
  }, [client, messageType, ...deps]);
}

/**
 * Legacy PortClientProvider component for backward compatibility
 * This is just a wrapper that initializes the port client
 */
export interface PortClientProviderProps {
  children: React.ReactNode;
  portName?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
}

export const PortClientProvider: React.FC<PortClientProviderProps> = ({
  children,
  ...config
}) => {
  const { client, isConnecting, error } = usePortClient(config);
  
  // Initialize the client when the component mounts
  useEffect(() => {
    if (!client && !isConnecting && !error) {
      initPortClient(config).catch(() => {});
    }
    
    // Clean up when the component unmounts
    return () => {
      // Don't disconnect here as other components might still be using the client
    };
  }, []);

  return <>{children}</>;
};
