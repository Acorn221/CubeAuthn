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
    // Get storage and passkeys
    const storage = new Storage({ area: "sync" }) // Passkeys are stored in sync storage
    const passkeys = await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials")
    const secret = await getSecret()
    
    // If no passkeys at all, bypass the auth dialog
    if (!passkeys) {
      console.log("No passkeys found in storage - bypassing auth dialog")
      return res.send({
        credential: null,
        success: false,
        error: "No passkeys available"
      })
    }
    
    // Check if there are any relevant credentials for this origin
    const origin = new URL(req.body.url).origin
    console.log("Checking for passkeys for origin:", origin)
    console.log("Available passkeys:", passkeys.map(p => ({ origin: p.origin, id: p.id, user: p.user.displayName })))
    
    // More flexible matching - check both exact origin and without trailing slash
    const relevantCredentials = passkeys.filter(cred => {
      const credOrigin = cred.origin;
      const originNoSlash = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      const credOriginNoSlash = credOrigin.endsWith('/') ? credOrigin.slice(0, -1) : credOrigin;
      
      return credOrigin === origin || credOriginNoSlash === originNoSlash;
    })
    
    console.log("Found relevant credentials:", relevantCredentials.length)
    
    if (relevantCredentials.length === 0) {
      console.log("No relevant passkeys found for origin:", origin, "- bypassing auth dialog")
      return res.send({
        credential: null,
        success: false,
        error: "No passkeys available for this origin"
      })
    }
    
    // Open the authentication dialog
    await ports.sendToTarget(
      "authDialog",
      { publicKey: req.body.publicKey },
      { url: req.body.url },
      true
    )

    // Wait for the user to set the cube and for the UI to send the cube number
    let unsubscribe: (() => void) | undefined
    const { cubeNum, origin: authOrigin, keyId } = await new Promise<
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

    const selectedPasskey = relevantCredentials.find(x => x.id === keyId);

    if(!selectedPasskey) {
      throw new Error("No matching passkey found for the given origin and keyId")
    }
    console.log("Selected passkey:", selectedPasskey);

    const credIdDecoded = new TextDecoder().decode(b64url.decode(selectedPasskey.id));

    const { naclKeyPair } = await generateKeyPairFromCube(cubeNum, secret, credIdDecoded);

    console.log("Generated NaCl key pair for auth:", naclKeyPair);
    
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
    
    // Sign count (4 bytes, big-endian) - keep at 0 to match registration
    const signCount = Uint8Array.of(0, 0, 0, 0)
    
    const authData = new Uint8Array([
      ...rpIdHash,
      ...flags,
      ...signCount
    ])
    
    // Hash the client data JSON
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", clientDataJSON)
    )
    
    // Log the data for debugging
    console.log("Auth Data:", Array.from(authData).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log("Client Data Hash:", Array.from(clientDataHash).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Data to sign is the concatenation of authData and clientDataHash
    const dataToSign = new Uint8Array(authData.length + clientDataHash.length)
    dataToSign.set(authData, 0)
    dataToSign.set(clientDataHash, authData.length)
    
    console.log("Data to Sign:", Array.from(dataToSign).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Sign the data using the private key with Ed25519 (TweetNaCl)
    const signature = nacl.sign.detached(dataToSign, naclKeyPair.secretKey)
    
    console.log("Signature:", Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Create and return the credential
    const credential = {
      type: "public-key",
      id: selectedPasskey.id,
      rawId: Array.from(b64url.decode(selectedPasskey.id)),
      response: {
        clientDataJSON: Array.from(clientDataJSON),
        authenticatorData: Array.from(authData),
        signature: Array.from(signature),
        userHandle: selectedPasskey.user ? Array.from(new TextEncoder().encode(selectedPasskey.user.id)) : null,
        transports: ["internal"] // Set transport to internal for platform authenticator
      },
      authenticatorAttachment: "platform"
    } satisfies WebAuthnCredential;
    
    console.log("✅ Generated authentication credential for site:", req.body.url)
    console.log("AUTH CRED", credential);
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
