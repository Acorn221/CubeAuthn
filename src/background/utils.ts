import { Storage } from "@plasmohq/storage";
import type { StoredWebAuthnCredential } from "./types";

// Import the WebAuthnCredential interface from handleRegister
interface WebAuthnCredential {
  type: string;
  rawId: number[];
  id: string;
  response: {
    clientDataJSON: number[];
    attestationObject: number[];
  };
}

export const getSecret = (
	storage?: Storage,
) => {
	if(!storage) {
		storage = new Storage();
	}

	const secret = storage.get<string>("secret");

	if(!secret) {
		// generate a new secret (32 bytes string) if it doesn't exist
		const newSecret = crypto.getRandomValues(new Uint8Array(32)).reduce((data, byte) => data + String.fromCharCode(byte), "");
		storage.set("secret", newSecret);

		return newSecret;
	}

	return secret;
}

/**
 * Saves a WebAuthn credential to storage
 */
export const saveWebAuthnCredential = async ({
	storage,
	credential,
	siteUrl,
	origin,
	rpId,
	user,
	publicKey
}: {
	storage?: Storage;
	credential: WebAuthnCredential;
	siteUrl: string;
	origin: string;
	rpId: string;
	user: {
		id: string;
		name: string;
		displayName: string;
	};
	publicKey: Uint8Array;
}) => {
	if (!storage) {
		storage = new Storage({ area: "sync" });
	}

	// Convert public key to base64url string for storage
	const publicKeyBase64 = Array.from(publicKey)
		.map(byte => String.fromCharCode(byte))
		.join('');
	const publicKeyBase64Url = btoa(publicKeyBase64)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

	// Create the stored credential object
	const storedCredential = {
		id: credential.id,
		siteUrl,
		origin,
		publicKey: publicKeyBase64Url,
		rpId,
		user,
		createdAt: Date.now()
	};

	// Get existing credentials
	const existingCredentials = await storage.get<Record<string, StoredWebAuthnCredential>>("webauthn_credentials") || {};
	
	// Add new credential
	existingCredentials[credential.id] = storedCredential;
	
	// Save to storage
	await storage.set("webauthn_credentials", existingCredentials);
	
	return storedCredential;
}

/**
 * Gets a WebAuthn credential from storage by ID
 */
export const getWebAuthnCredential = async (
	credentialId: string,
	storage?: Storage
) => {
	if (!storage) {
		storage = new Storage({ area: "sync" });
	}
	
	const credentials = await storage.get<Record<string, StoredWebAuthnCredential>>("webauthn_credentials") || {};
	return credentials[credentialId];
}

/**
 * Gets all WebAuthn credentials from storage
 */
export const getAllWebAuthnCredentials = async (
	storage?: Storage
) => {
	if (!storage) {
		storage = new Storage({ area: "sync" });
	}
	
	return await storage.get<Record<string, StoredWebAuthnCredential>>("webauthn_credentials") || {};
}