import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { InboundMessages, OutboundMessages } from "@/background/types";
import { PortClient as PortClientRaw } from "./port-messaging-cs-api";
import type { ClientMessageHandler } from "./port-messaging-cs-api";
import type { ConnectionInfo } from "@/background/port-messaging-api";

// @ts-expect-error Error here - not sure why!
type PortClient = PortClientRaw<InboundMessages, OutboundMessages>

// Create a context for the port client
const PortClientContext = createContext<PortClient | null>(null);

// Provider component to initialize and provide the port client
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
  portName,
  autoReconnect = true,
  reconnectDelay = 1000,
  maxReconnectAttempts = 5,
  timeout = 10000,
}) => {
  const [client, setClient] = useState<PortClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        
        // @ts-expect-error Create client with separate inbound/outbound types
        const portClient = new PortClient<InboundMessages, OutboundMessages>({
          portName,
          autoReconnect,
          reconnectDelay,
          maxReconnectAttempts,
          timeout
        });
        
        await portClient.connect();
        setClient(portClient);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect to background script'));
        console.error('Port client connection error:', err);
      } finally {
        setIsConnecting(false);
      }
    };

    initClient();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [portName, autoReconnect, reconnectDelay, maxReconnectAttempts, timeout]);

  return (
    <PortClientContext.Provider value={client}>
      {children}
    </PortClientContext.Provider>
  );
};

// Hook to access the port client
export const usePortClient = () => {
  const client = useContext(PortClientContext);
  
  if (!client) {
    throw new Error('usePortClient must be used within a PortClientProvider');
  }
  
  return client;
};

// Hook to send messages
export function useSendMessage<K extends keyof InboundMessages>(
  messageType: K
) {
  const client = usePortClient();
  
  return useCallback(
    (payload: InboundMessages[K]['request'], awaitResponse: boolean = true) => {
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

// Hook to register a message handler
export function useMessageHandler<K extends keyof OutboundMessages>(
  messageType: K,
  handler: ClientMessageHandler<OutboundMessages[K]['request'], OutboundMessages[K]['response']>,
  deps: React.DependencyList = []
) {
  const client = usePortClient();
  
  useEffect(() => {
		// @ts-expect-error bruh
    const unsubscribe = client.on(messageType, handler);
    return unsubscribe;
  }, [client, messageType, ...deps]);
}
