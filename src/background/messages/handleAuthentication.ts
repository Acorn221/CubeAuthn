import type { PlasmoMessaging } from "@plasmohq/messaging"
import { sendToContentScript } from "@plasmohq/messaging"

import { ports } from ".."
import type {
  InboundMessages,
  PublicKeyCredentialRequestOptionsSerialized
} from "../types"

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
    const opened = await ports.sendToTarget(
      "authDialog",
      { publicKey: req.body.publicKey },
      { url: req.body.url },
      true
    )

    if (!opened) {
      throw new Error("Failed to connect to the isolated content script")
    }

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

    console.log("⏳ Creating WebAuthn credential with cube state:", cubeNum)


    

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
