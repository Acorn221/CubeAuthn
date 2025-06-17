import nacl from "tweetnacl"

import type { WebAuthnCredential } from "@/background/types"
import { b64url, encodeCBOR, generateKeyPairFromCube } from "@/utils"

export type HandleRegisterRequest = {
	publicKey: CredentialCreationOptions["publicKey"]
	url: string
}

export type HandleRegisterResponse = {
	credential: WebAuthnCredential | null
	success: boolean
	error?: string
}

/**
 * Creates a fake WebAuthn credential using the cube state
 */
export const createFakeCredentialIntercept = async ({
	publicKey,
	cubeNum,
	secret,
	origin
}: {
	publicKey: PublicKeyCredentialCreationOptions
	cubeNum: string
	secret?: string
	origin: string
}): Promise<{
	credential: WebAuthnCredential
	naclKeyPair: nacl.SignKeyPair
	credId: Uint8Array<ArrayBufferLike>
}> => {
	// Extract challenge and relying party info
	const challenge = new Uint8Array(publicKey.challenge as ArrayBuffer)
	const rpId = publicKey.rp.id

	// Generate key pair from cube state
	const { credId, naclKeyPair } = await generateKeyPairFromCube(cubeNum, secret)

	// Create a custom COSE key from the nacl public key
	// TweetNaCl uses Ed25519, so we should use that curve identifier
	const coseMap = new Map<number, number | Uint8Array>([
		[1, 1], // kty: OKP (Octet Key Pair) for Ed25519
		[3, -8], // alg: EdDSA
		[-1, 6], // crv: Ed25519
		[-2, naclKeyPair.publicKey] // x: full public key for Ed25519
	])

	const coseKey = encodeCBOR(coseMap)

	// Create authenticator data
	const rpIdHash = new Uint8Array(
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))
	)
	const flags = Uint8Array.of(0x41) // user present + attested credential data
	const signCount = Uint8Array.of(0, 0, 0, 0)
	const aaguid = new Uint8Array(16)
	const credIdLen = Uint8Array.of(credId.length >> 8, credId.length & 0xff)

	const authData = new Uint8Array([
		...rpIdHash,
		...flags,
		...signCount,
		...aaguid,
		...credIdLen,
		...credId,
		...coseKey
	])

	// Create client data JSON
	const clientDataJSON = new TextEncoder().encode(
		JSON.stringify({
			type: "webauthn.create",
			challenge: b64url.encode(challenge),
			origin,
			crossOrigin: false
		})
	)

	// Create attestation object
	const attestationMap = new Map<
		string,
		string | Map<string, unknown> | Uint8Array<ArrayBuffer>
	>([
		["fmt", "none"],
		["attStmt", new Map()],
		["authData", authData]
	])

	const attestationObject = encodeCBOR(attestationMap)

	// Create and return credential
	return {
		credential: {
			type: "public-key",
			rawId: Array.from(credId),
			id: b64url.encode(credId),
			response: {
				clientDataJSON: Array.from(clientDataJSON),
				attestationObject: Array.from(attestationObject)
			}
		},
		credId,
		naclKeyPair
	}
}