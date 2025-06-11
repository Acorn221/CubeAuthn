import type { MessageDefinitions } from "./port-messaging-api";

export interface InboundMessages extends MessageDefinitions {
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

export interface OutboundMessages extends MessageDefinitions {
	updateSettings: {
		request: { theme: 'dark' | 'light' };
		response: { applied: boolean };
	};
	notify: {
		request: { message: string; type: 'info' | 'error' };
		response: { acknowledged: boolean };
	};
}