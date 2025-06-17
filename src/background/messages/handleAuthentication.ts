import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import nacl from "tweetnacl"

import { ports } from ".."
import type {
  InboundMessages,
  PublicKeyCredentialRequestOptionsSerialized,
  StoredWebAuthnCredential,
  WebAuthnCredential
} from "../types"
import { getSecret } from "../utils"
import { b64url, encodeCBOR, generateKeyPairFromCube } from "../../utils"

export type HandleAuthenticationRequest = {
  publicKey: PublicKeyCredentialRequestOptionsSerialized
  url: string
}

export type HandleAuthenticationResponse = {
  credential: any
  success: boolean
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  HandleAuthenticationRequest,
  HandleAuthenticationResponse
> = async (req, res) => {
  try {
    // Open the authentication dialog
    await ports.sendToTarget(
      "authDialog",
      { publicKey: req.body.publicKey },
      { url: req.body.url },
      true
    )

    // Wait for the user to set the cube and for the UI to send the cube number
    let unsubscribe: (() => void) | undefined
    const { cubeNum, origin, keyId } = await new Promise<
      InboundMessages["auth"]["request"]
    >((resolve) => {
      unsubscribe = ports.registerHandler("auth", async (data) => {
        resolve(data)
        return { success: true }
      })
    })

    // Unsubscribe from the handler
    unsubscribe?.()

    console.log(
      `⏳ Creating WebAuthn credential with cube state: ${cubeNum}, origin: ${origin}, keyId: ${keyId}`
    )

    const storage = new Storage({ area: "sync" }) // Passkeys are stored in sync storage
    const secret = await getSecret()


    const passkeys = await storage.get<StoredWebAuthnCredential[]>(
      "webauthn_credentials"
    );

    if (!passkeys) {
      throw new Error("No passkeys found in storage")
    }

    const selectedPasskey = passkeys.find(x => x.origin === origin && x.id === keyId);

    if(!selectedPasskey) {
      throw new Error("No matching passkey found for the given origin and keyId")
    }

    // Generate key pair from cube state
    const { naclKeyPair, credId } = await generateKeyPairFromCube(cubeNum, secret, keyId)
    
    // Extract challenge from request
    const challenge = new Uint8Array(req.body.publicKey.challenge as unknown as ArrayBuffer)
    
    // Create client data JSON
    const clientDataJSON = new TextEncoder().encode(
      JSON.stringify({
        type: "webauthn.get",
        challenge: b64url.encode(challenge),
        origin,
        crossOrigin: false
      })
    )
    
    // Create authenticator data
    const rpIdHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(selectedPasskey.rpId))
    )
    
    // Flags: User Present (1) and User Verified (4) = 5
    const flags = Uint8Array.of(0x05)
    
    // Sign count (4 bytes, big-endian)
    const signCount = Uint8Array.of(0, 0, 0, 1)
    
    const authData = new Uint8Array([
      ...rpIdHash,
      ...flags,
      ...signCount
    ])
    
    // TODO: Create signature by signing the concatenation of authData and clientDataHash
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", clientDataJSON)
    )
    
    // Data to sign is the concatenation of authData and clientDataHash
    const dataToSign = new Uint8Array(authData.length + clientDataHash.length)
    dataToSign.set(authData, 0)
    dataToSign.set(clientDataHash, authData.length)
    
    // Sign the data using the private key
    const signature = nacl.sign.detached(dataToSign, naclKeyPair.secretKey)
    
    // Create and return the credential
    const credential = {
      type: "public-key",
      id: keyId,
      rawId: Array.from(b64url.decode(keyId)),
      response: {
        clientDataJSON: Array.from(clientDataJSON),
        authenticatorData: Array.from(authData),
        signature: Array.from(signature),
        userHandle: null // TODO: set the userHandle as the `${rp.id}-${user.name}` b64 encoded
      },
      authenticatorAttachment: "platform",
    } satisfies WebAuthnCredential;
    
    console.log("✅ Generated authentication credential for site:", req.body.url)
    
    res.send({
      credential,
      success: true
    })
  } catch (error) {
    console.error("Error handling authentication:", error)
    res.send({
      credential: null,
      success: false,
      error: String(error)
    })
  }
}

export default handler
