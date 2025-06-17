import { getSecret, getSecretStorage, saveWebAuthnCredential } from "@/background/utils"

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import { ports } from ".."
import type { InboundMessages, PublicKeyCredentialCreationOptionsSerialized, WebAuthnCredential } from "../types"
import { b64url, createFakeCredentialIntercept } from "@/utils"

export type HandleRegisterRequest = {
  publicKey: PublicKeyCredentialCreationOptionsSerialized
  url: string
}

export type HandleRegisterResponse = {
  credential: WebAuthnCredential | null
  success: boolean
  error?: string
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
      "registerDialog",
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
      InboundMessages["register"]["request"]
    >((resolve) => {
      unsubscribe = ports.registerHandler("register", async (data) => {
        resolve(data)
        return { success: true }
      })
    })

    // Unsubscribe from the handler
    unsubscribe?.()

    console.log("⏳ Creating WebAuthn credential with cube state:", cubeNum)

    // Get settings
    const storage = new Storage({ area: "sync" }) // Settings are stored in sync storage
    const useSameCubeScramble =
      (await storage.get<boolean>("useSameCubeScramble")) || false
    const useStoredSecretEntropy =
      (await storage.get<boolean>("useStoredSecretEntropy")) || true

    // Use the appropriate storage area based on settings
    const credentialStorage = await getSecretStorage();

    // Use fixed cube scramble if enabled and available

    console.log(
      "⏳ Using cube state:",
      useSameCubeScramble ? "fixed scramble" : "current scramble"
    )
    console.log(
      "⏳ Using stored secret entropy:",
      useStoredSecretEntropy ? "yes" : "no"
    )

    const secret = await getSecret();

    // Create WebAuthn credential using the cube state
    const { credential, naclKeyPair } = await createFakeCredentialIntercept({
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
