import type { PlasmoMessaging } from "@plasmohq/messaging"

import { ports } from ".."

export type HandleRegisterRequest = {
  publicKey: CredentialCreationOptions["publicKey"]
  url: string
}

export type HandleRegisterResponse = {
  credential: any
  success: boolean
  error?: string
}

// TODO: NEED TO FIX THIS ERROR: "Error: No connections found for target: {\"url\":\"https://webauthn.io/\"}"

const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    const opened = await ports.sendToTarget(
      "openAuthDialog",
      {},
      {
        url: req.body.url
      },
      true
    )

    if (!opened) {
      throw new Error("Failed to connect to the isolated content script")
    }
    // Wait for the user to set the cube and for the ui to send over the cube number
    let unsubscribe: () => void | undefined = undefined;
    const cubeNum = await new Promise((resolve) => {
      unsubscribe = ports.registerHandler("auth", async (data) => {
        resolve(data.cubeNum);
        return { success: true };
      });
    });
    // Unsubscribe from the handler once we have the cube number
    unsubscribe?.();

    // TODO: from the challenge and cube num, generate the webauthn shizz and return it to the UI

    // res.send({
    //   credential: req.body.options,
    //   success: true
    // })
  } catch (error) {
    console.error("Error handling registration:", error)
    res.send({
      credential: null,
      success: false,
      error: String(error)
    })
  }
}

export default handler
