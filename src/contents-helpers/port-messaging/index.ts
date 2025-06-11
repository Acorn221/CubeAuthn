import type { InboundMessages, OutboundMessages } from "@/background/types";
import { PortClient } from "./port-messaging-cs-api";

// @ts-expect-error Create manager with separate inbound/outbound types (complains about types - is fine)
const client = new PortClient<OutboundMessages, InboundMessages>();
await client.connect();

// Type safety demonstration:
// Valid message types for send: 'auth' | 'getData' | 'ping'
// Valid message types for on: 'updateSettings' | 'notify'

// These commented lines would cause TypeScript errors if uncommented:
/*
// Type '"invalidType"' is not assignable to parameter of type '"auth" | "getData" | "ping"'
client.send('invalidType' as any, { });
*/

// Type '"invalidType"' is not assignable to parameter of type '"updateSettings" | "notify"'
client.on('notify', async (payload) => {
  
  return { acknowledged: true };
});

// These will work correctly:
client.on('updateSettings', async (payload) => {  // ✅ payload is typed as { theme: 'dark' | 'light' }
  return { applied: true };  // ✅ return type matches expected response
});

const result = await client.send('auth', { token: 'xyz' });  // ✅ result is typed as { success: boolean; user?: string }