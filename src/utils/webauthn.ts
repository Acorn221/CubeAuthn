import type { WebAuthnCredential } from "@/background/types"
import { encodeCBOR } from "./cobr"
import { generateKeyPairFromCube } from "./crypto"
import { b64url } from "./base64"

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
  const { credId, credIdBytes, naclKeyPair } = await generateKeyPairFromCube(cubeNum, secret)

  // Create a custom COSE key from the nacl public key
  const coseMap = new Map<number, number | Uint8Array>([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, naclKeyPair.publicKey.slice(0, 32)], // x: first 32 bytes of nacl public key
    [-3, naclKeyPair.publicKey.slice(0, 32)] // y: first 32 bytes of nacl public key
  ])

  const coseKey = encodeCBOR(coseMap)

  // Create authenticator data
  const rpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-512", new TextEncoder().encode(rpId))
  )
  const flags = Uint8Array.of(0x41) // user present + attested credential data
  const signCount = Uint8Array.of(0, 0, 0, 0)
  const aaguid = new Uint8Array(16)
  const credIdLen = Uint8Array.of(credIdBytes.length >> 8, credIdBytes.length & 0xff)

  const authData = new Uint8Array([
    ...rpIdHash,
    ...flags,
    ...signCount,
    ...aaguid,
    ...credIdLen,
    ...credIdBytes,
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
      rawId: Array.from(credIdBytes),
      id: credId,
      response: {
        clientDataJSON: Array.from(clientDataJSON),
        attestationObject: Array.from(attestationObject)
      }
    },
    credId: credIdBytes,
    naclKeyPair
  }
}