export interface BaseMessage {
  messageType: string;
  messageId: string;
  payload: any;
}

// Define request/response pairs in one place
export type MessageDefinitions = {
	getUrlAndTab: {
		request: {};
		response: { url: string; tabId: number };
	};
  auth: {
    request: { token: string };
    response: { success: boolean; user?: any };
  };
  getData: {
    request: { url: string };
    response: { data?: any; error?: string };
  };
  updateConfig: {
    request: { config: any };
    response: { success: boolean };
  };
};

// Extract request types (Background -> Content Script)
export type BackgroundOutgoingPayload = {
  [K in keyof MessageDefinitions]: {
    messageType: K;
    payload: MessageDefinitions[K]['request'];
  };
}[keyof MessageDefinitions];

// Extract response types (Content Script -> Background)
export type BackgroundIncomingPayload = {
  [K in keyof MessageDefinitions]: {
    messageType: `${K & string}Result`;
    payload: MessageDefinitions[K]['response'];
  };
}[keyof MessageDefinitions];

// Full message types (with messageId)
export type BackgroundOutgoing = BackgroundOutgoingPayload & { messageId: string };
export type BackgroundIncoming = BackgroundIncomingPayload & { messageId: string };

export type GetResponseType<T extends BackgroundOutgoingPayload> = 
  T extends { messageType: infer K }
    ? K extends keyof MessageDefinitions 
      ? MessageDefinitions[K]['response']
      : never
    : never;

// Simple handler type
export type MessageHandler<T extends BackgroundIncoming> = (msg: T, port: chrome.runtime.Port) => void;

