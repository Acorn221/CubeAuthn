import type { MessageDefinitions } from "./port-messaging-api";

export interface InboundMessages {
	auth: {
		request: { cubeNum: string };
		response: { success: boolean; };
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
	openAuthDialog: {
		request: {};
		response: {};
	};
	getCubeStateNumber: {
		request: {};
		response: { num: string }; // using string bc it's a big number
	};
}