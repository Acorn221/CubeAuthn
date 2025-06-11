import { PortManager } from "./port-messaging-api";
import type { InboundMessages, OutboundMessages } from "./types";

// @ts-expect-error Create manager with separate inbound/outbound types (complains about types - is fine)
export const ports = new PortManager<InboundMessages, OutboundMessages>({
  timeout: 1000*60*15, // 15 mins as it could take the user a while to do the cube
});

// // Register handlers for incoming messages
// const unsubscribeAuth = ports.registerHandler('auth', async (payload, connectionInfo) => {
//   console.log(`Auth request from ${connectionInfo.url}`);
//   const isValid = payload.token === 'valid-token';
//   return { 
//     success: isValid, 
//     user: isValid ? 'john-doe' : undefined 
//   };
// });

// ports.registerHandler('auth', () => {})

// const unsubscribePing = ports.registerHandler('ping', (payload, connectionInfo) => {
//   console.log(`Ping from tab ${connectionInfo.tabId}`);
//   return { pong: true };
// });

// const unsubscribeGetData = ports.registerHandler('getData', async (payload) => {
//   // Simple mock data based on ID
//   const mockData = ['item1', 'item2', 'item3'];
//   return { data: mockData };
// });

// // Send outbound messages (typed to OutboundMessages)
// try {
//   ports.send('updateSettings', { theme: 'dark' }).to({ tabId: 123 });
// } catch (error) {
//   console.error('Failed to send:', error);
// }

// // Await response from outbound message
// try {
//   const notifyResult = await ports.send('notify', { 
//     message: 'Settings updated', 
//     type: 'info' 
//   }).to({ tabId: 123 }, true);
  
//   console.log('Notification acknowledged:', notifyResult.acknowledged);
// } catch (error) {
//   console.error('Notification failed:', error);
// }

// // Broadcast outbound message
// ports.broadcast('notify', { message: 'System maintenance', type: 'info' });

// // Clean up handlers when done
// unsubscribeAuth();
// unsubscribePing();
// unsubscribeGetData();