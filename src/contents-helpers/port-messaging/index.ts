import type { InboundMessages, OutboundMessages } from "@/background/types";
import { 
  initPortClient, 
  getPortClient, 
  disconnectPortClient,
  onPortClientChange,
  usePortClient,
  useSendMessage,
  useMessageHandler,
  type PortClientConfig
} from "./hooks";

// Export all the functions and types
export {
  initPortClient,
  getPortClient,
  disconnectPortClient,
  onPortClientChange,
  usePortClient,
  useSendMessage,
  useMessageHandler,
  type PortClientConfig
};

// Initialize the port client as early as possible
// This allows non-React code to use the port client
// We don't await this promise to avoid blocking, but we catch any errors
initPortClient().catch(error => {
  console.error('Failed to initialize port client:', error);
});

// Example of direct usage without hooks:
/*
// Send a message
try {
  const client = getPortClient();
  const result = await client.send('auth', { token: 'xyz' });
  console.log(result);
} catch (error) {
  console.error('Error sending message:', error);
}

// Register a message handler
const client = getPortClient();
const unsubscribe = client.on('notify', async (payload) => {
  console.log('Received notification:', payload);
  return { acknowledged: true };
});

// Later, unsubscribe
unsubscribe();
*/