import { getSecret, saveWebAuthnCredential } from "@/background/utils"
import nacl from "tweetnacl"

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import { ports } from ".."
import type { InboundMessages, WebAuthnCredential } from "../types"
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
const createFakeCredentialIntercept = async ({
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

/**
 * Handles WebAuthn registration requests
 */
const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    // Open the authentication dialog
    const opened = await ports.sendToTarget(
      "openAuthDialog",
      { publicKey: req.body.publicKey },
      { url: req.body.url },
      true
    )

    if (!opened) {
      throw new Error("Failed to connect to the isolated content script")
    }

    // Wait for the user to set the cube and for the UI to send the cube number
    let unsubscribe: (() => void) | undefined
    const { cubeNum, origin } = await new Promise<
      InboundMessages["auth"]["request"]
    >((resolve) => {
      unsubscribe = ports.registerHandler("auth", async (data) => {
        resolve(data)
        return { success: true }
      })
    })

    // Unsubscribe from the handler
    unsubscribe?.()

    console.log("⏳ Creating WebAuthn credential with cube state:", cubeNum)

    // Get settings
    const storage = new Storage({ area: "sync" }) // Settings are stored in sync storage
    const storageArea =
      (await storage.get<"local" | "sync">("storageArea")) || "sync"
    const useSameCubeScramble =
      (await storage.get<boolean>("useSameCubeScramble")) || false
    const useStoredSecretEntropy =
      (await storage.get<boolean>("useStoredSecretEntropy")) || true

    // Use the appropriate storage area based on settings
    const credentialStorage = new Storage({ area: storageArea })

    // Use fixed cube scramble if enabled and available

    console.log(
      "⏳ Using cube state:",
      useSameCubeScramble ? "fixed scramble" : "current scramble"
    )
    console.log(
      "⏳ Using stored secret entropy:",
      useStoredSecretEntropy ? "yes" : "no"
    )

    const secret = await getSecret(credentialStorage)

    // Create WebAuthn credential using the cube state
    const { credential, credId, naclKeyPair } = await createFakeCredentialIntercept({
      publicKey: req.body.publicKey,
      cubeNum,
      secret,
      origin
    })

    console.log("✅ Generated credential with cube state:", cubeNum)

    // Save the site URL and the public key to the storage
    // Extract user information from the publicKey options
    const publicKeyOptions = req.body.publicKey

    const user = publicKeyOptions.user
      ? {
          id: b64url.encode(
            new Uint8Array(publicKeyOptions.user.id as ArrayBuffer)
          ),
          name: publicKeyOptions.user.name || "",
          displayName: publicKeyOptions.user.displayName || ""
        }
      : {
          id: "unknown",
          name: "Unknown User",
          displayName: "Unknown User"
        }

    // Save the credential to storage
    await saveWebAuthnCredential({
      storage: credentialStorage,
      credential,
      siteUrl: req.body.url,
      origin,
      rpId: publicKeyOptions.rp.id || origin,
      user,
      publicKey: naclKeyPair.publicKey
    })

    console.log(
      "✅ Saved credential for site:",
      req.body.url,
      "with ID:",
      credential.id
    )

    res.send({
      credential,
      success: true
    })
  } catch (error) {
    console.error("❌ Error handling registration:", error)
    res.send({
      credential: null,
      success: false,
      error: String(error)
    })
  }
}

export default handler
