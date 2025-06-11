import type { PlasmoMessaging } from "@plasmohq/messaging"

import { ports } from ".."

export type HandleRegisterRequest = {
  publicKey: CredentialCreationOptions["publicKey"];
  url: string;
}

export type HandleRegisterResponse = {
  credential: any;
  success: boolean;
  error?: string;
}

// TODO: NEED TO FIX THIS ERROR: "Error: No connections found for target: {\"url\":\"https://webauthn.io/\"}"

const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    const connection = await ports.sendToTarget(
      "connectCube",
      {},
      {
        url: req.body.url
      },
      true
    )

    if (!connection || !connection.result) {
      throw new Error("Failed to connect to the cube")
    }
    // Get the current cube state
    const res = await ports.sendToTarget(
      "getCubeStateNumber",
      {},
      {
        url: req.body.url
      },
      true
    )
    if (!res) {
      throw new Error("No response :(")
    }

    const { num } = res
    console.log("Using cube state for registration:", num)

    // TODO: from the challenge and cube num, generate the webauthn shizz

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
