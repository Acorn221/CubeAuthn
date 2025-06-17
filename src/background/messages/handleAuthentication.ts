import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import { ports } from ".."
import type {
  InboundMessages,
  PublicKeyCredentialRequestOptionsSerialized,
  StoredWebAuthnCredential
} from "../types"
import { getSecret } from "../utils"
import { generateKeyPairFromCube } from "../../utils"

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

    const { naclKeyPair } = await generateKeyPairFromCube(cubeNum, secret, keyId)
    

    // TODO: get the key from storage ✅
    // TODO: Make sure the origin and keyId match the request ✅
    // TODO: generate the keypair from the cube state ✅
    // TODO: generate the COSE key from the nacl public key
    // TODO: finish the rest of the webauthn expected return values

    // res.send({
    //   credential: req.body.options,
    //   success: true
    // });

    throw new Error("TMP")
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
