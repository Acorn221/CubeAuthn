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

export type SerializablePublicKeyCredential = {
    id: string;
    type: string;
    rawId: string; // ArrayBuffer -> base64
    authenticatorAttachment: string | null;
    response: {
        clientDataJSON: string; // ArrayBuffer -> base64
        // For AuthenticatorAttestationResponse
        attestationObject?: string; // ArrayBuffer -> base64
        authenticatorData?: string; // ArrayBuffer -> base64
        publicKey?: string | null; // ArrayBuffer -> base64
        publicKeyAlgorithm?: number;
        transports?: string[];
        // For AuthenticatorAssertionResponse
        signature?: string; // ArrayBuffer -> base64
        userHandle?: string | null; // ArrayBuffer -> base64
    };
    clientExtensionResults: {
        appid?: boolean;
        credProps?: {
            rk?: boolean;
        };
        hmacCreateSecret?: boolean;
        prf?: {
            enabled?: boolean;
            results?: {
                first: string; // BufferSource -> base64
                second?: string; // BufferSource -> base64
            };
        };
    };
};