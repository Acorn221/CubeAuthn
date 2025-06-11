import type { BackgroundIncoming, BackgroundOutgoing, BackgroundOutgoingPayload, GetResponseType } from './types';

interface PendingMessage {
  message: BackgroundOutgoing;
  resolve?: (response: any) => void;
  reject?: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

type CustomPort = chrome.runtime.Port & {
  sendTypedMessage: {
    <T extends BackgroundOutgoingPayload>(message: T): void;
    <T extends BackgroundOutgoingPayload>(message: T, promise: true): Promise<GetResponseType<T>>;
  };
}

const connections: CustomPort[] = [];

chrome.runtime.onConnect.addListener(function(port) {
  if(port.sender) {
    console.warn("Received message from port with sender:", port.sender);
    return;
  }
  const messagesAwaitingResponse: PendingMessage[] = [];

  // Helper to send messages - auto-generates messageId
  function sendTypedMessage<T extends BackgroundOutgoingPayload>(message: T): void;
  function sendTypedMessage<T extends BackgroundOutgoingPayload>(message: T, promise: true): Promise<GetResponseType<T>>;
  function sendTypedMessage<T extends BackgroundOutgoingPayload>(message: T, promise?: true): void | Promise<GetResponseType<T>> {
    const fullMessage: BackgroundOutgoing = {
      ...message,
      messageId: crypto.randomUUID()
    };

    if (promise) {
      return new Promise<GetResponseType<T>>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = messagesAwaitingResponse.findIndex(p => p.message.messageId === fullMessage.messageId);
          if (index !== -1) {
            messagesAwaitingResponse.splice(index, 1);
          }
          reject(new Error(`Message timeout: ${fullMessage.messageType}`));
        }, 10000); // 10 second timeout

        messagesAwaitingResponse.push({
          message: fullMessage,
          resolve,
          reject,
          timeout
        });
        
        port.postMessage(fullMessage);
      });
    } else {
      messagesAwaitingResponse.push({ message: fullMessage });
      port.postMessage(fullMessage);
    }
  }

  const customPort: CustomPort = {
    ...port,
    sendTypedMessage
  };

  connections.push(customPort);

  // Example usage
  customPort.sendTypedMessage({
    messageType: "getUrlAndTab",
    payload: {},
  });
  
  port.onDisconnect.addListener(function() {
    const index = connections.indexOf(customPort);
    if (index !== -1) {
      connections.splice(index, 1);
    } else {
      console.warn("Port not found in connections on disconnect:", customPort.name);
    }
    
    // Reject all pending promises for this port
    messagesAwaitingResponse.forEach(pending => {
      if (pending.reject) {
        pending.reject(new Error("Port disconnected"));
      }
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
    });
    messagesAwaitingResponse.length = 0;
    
    console.log("Port disconnected:", customPort.name);
  });
  
  console.log("Port connected:", customPort.name);
  
  port.onMessage.addListener(function(msg: BackgroundIncoming) {
    const pendingIndex = messagesAwaitingResponse.findIndex(
      (pending) => pending.message.messageId === msg.messageId
    );
    
    if (pendingIndex !== -1) {
      const pending = messagesAwaitingResponse[pendingIndex];
      messagesAwaitingResponse.splice(pendingIndex, 1);
      
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      
      if (pending.resolve) {
        // Promise-based message
        pending.resolve(msg.payload);
      } else {
        // Regular message
        handleResponse(msg, pending.message, customPort);
      }
    } else {
      // Handle unsolicited message
      console.warn("Received unsolicited message:", msg);
    }
  });
});

const handleResponse = (response: BackgroundIncoming, originalMessage: BackgroundOutgoing, port: CustomPort) => {
  switch (response.messageType) {
    case "authResult":
      console.log("Auth result:", response.payload);
      break;
    case "getDataResult":
      console.log("Data result:", response.payload);
      break;
    case "updateConfigResult":
      console.log("Config updated:", response.payload);
      break;
  }
}

// Send message to all connected ports
export const broadcastMessage = (messagePayload: BackgroundOutgoingPayload) => {
  connections.forEach(port => {
    port.sendTypedMessage(messagePayload);
  });
}

// Send message to specific port by name
export const sendMessageToPort = <T extends BackgroundOutgoingPayload>(portName: string, message: T) => {
  const port = connections.find(p => p.name === portName);
  if (port) {
    port.sendTypedMessage(message);
  } else {
    console.warn(`Port with name "${portName}" not found`);
  }
}

// Send message with promise to specific port
export const sendMessageToPortWithResponse = async <T extends BackgroundOutgoingPayload>(
  portName: string, 
  message: T
): Promise<GetResponseType<T>> => {
  const port = connections.find(p => p.name === portName);
  if (port) {
    return await port.sendTypedMessage(message, true);
  } else {
    throw new Error(`Port with name "${portName}" not found`);
  }
}

let x = await sendMessageToPortWithResponse("test", {
	messageType: "getUrlAndTab",
	payload: {}
});

// Usage examples:
/*
// Fire and forget
port.sendTypedMessage({ messageType: "auth", payload: { token: "abc" } });

// With promise - TypeScript now knows this returns { success: boolean; user?: any }
const authResult = await port.sendTypedMessage({ messageType: "auth", payload: { token: "abc" } }, true);
console.log("Auth success:", authResult.success); // ✅ TypeScript knows this exists
console.log("User:", authResult.user); // ✅ TypeScript knows this is optional

// Different message type - TypeScript knows this returns { url: string; tabId: number }
const urlData = await port.sendTypedMessage({ messageType: "getUrlAndTab", payload: {} }, true);
console.log("URL:", urlData.url); // ✅ TypeScript knows this exists
console.log("Tab ID:", urlData.tabId); // ✅ TypeScript knows this exists

// Broadcast to all
broadcastMessage({ messageType: "updateConfig", payload: { config: {} } });

// Send to specific port with response - properly typed!
try {
  const data = await sendMessageToPortWithResponse("content-script", { 
    messageType: "getData", 
    payload: { url: "https://example.com" } 
  });
  // TypeScript knows data is { data?: any; error?: string }
  if (data.error) {
    console.error("Error:", data.error);
  } else {
    console.log("Got data:", data.data);
  }
} catch (error) {
  console.error("Failed to get data:", error);
}
*/