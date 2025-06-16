import type { MessageDefinitions } from "./port-messaging-api";

export interface InboundMessages {
	auth: {
		request: { cubeNum: string, origin: string };
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
		request: {
			publicKey: CredentialCreationOptions["publicKey"];
		};
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

/**
 * Represents a stored WebAuthn credential for a site
 * Contains only the data needed for verification, NOT private keys or cube state
 */
export interface StoredWebAuthnCredential {
    // Unique identifier for this credential
    id: string;
    
    // The site URL this credential is for
    siteUrl: string;
    
    // The origin of the site (e.g., https://example.com)
    origin: string;
    
    // The base64url-encoded public key
    publicKey: string;
    
    // Relying Party ID
    rpId: string;
    
    // User information from the credential
    user: {
        id: string;
        name: string;
        displayName: string;
    };
    
    // When this credential was created
    createdAt: number;
}

export type CubeHashConfig = {
	iterations: number;
	salt: string;
	hash: string;
} | undefined;


/**
 * WebAuthn credential response
 */
export interface WebAuthnCredential {
  type: string
  rawId: number[]
  id: string
  response: {
    clientDataJSON: number[]
    attestationObject: number[]
  }
}