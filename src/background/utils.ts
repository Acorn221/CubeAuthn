import { Storage } from "@plasmohq/storage";
import type { StoredWebAuthnCredential, WebAuthnCredential } from "./types";

/**
 * Gets the configured storage area from settings
 */
export const getStorageArea = async (): Promise<"local" | "sync"> => {
	const storage = new Storage({ area: "sync" }); // Setting stored in sync
	return await storage.get<"local" | "sync">("storageArea") || "sync";
}

/**
 * Gets whether to use stored secret entropy
 */
export const getUseStoredSecretEntropy = async (): Promise<boolean> => {
	const storage = new Storage({ area: "sync" }); // Setting stored in sync
	return await storage.get<boolean>("useStoredSecretEntropy") ?? true;
}

/**
 * Creates a storage instance with the configured area
 */
export const getSecretStorage = async (): Promise<Storage> => {
	const area = await getStorageArea();
	return new Storage({ area });
}

/**
 * Gets the secret entropy used for key generation
 * If useStoredSecretEntropy is false, returns an empty string
 */
export const getSecret = async (
	storage?: Storage,
): Promise<string | undefined> => {
	// Check if we should use stored secret entropy
	const useStoredSecretEntropy = await getUseStoredSecretEntropy();
	if (!useStoredSecretEntropy) {
		return undefined;
	}

	if(!storage) {
		storage = await getSecretStorage();
	}

	const secret = await storage.get<string>("secret");

	if(!secret) {
		// generate a new secret (32 bytes string) if it doesn't exist
		const newSecret = crypto.getRandomValues(new Uint8Array(32)).reduce((data, byte) => data + String.fromCharCode(byte), "");
		await storage.set("secret", newSecret);

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
	const existingCredentials = await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials") || [];
	
	// Add new credential
	existingCredentials.push(storedCredential);
	
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
	
	const credentials = await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials") || [];
	return credentials.find(cred => cred.id === credentialId);
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
	
	return await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials") || [];
}