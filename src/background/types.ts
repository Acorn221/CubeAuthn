import type { MessageDefinitions } from "./port-messaging-api";

export interface InboundMessages {
	auth: {
		request: { token: string };
		response: { success: boolean; user?: string };
	};
	getData: {
		request: { id: string };
		response: { data: string[] };
	};
}

export interface OutboundMessages {
	updateSettings: {
		request: { theme: 'dark' | 'light' };
		response: { applied: boolean };
	};
	notify: {
		request: { message: string; type: 'info' | 'error' };
		response: { acknowledged: boolean };
	};
	connectCube: {
		request: {},
		response: { result: boolean } // using string bc it's a big number
	};
	getCubeStateNumber: {
		request: {};
		response: { num: string }; // using string bc it's a big number
	};
}