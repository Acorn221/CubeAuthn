import type { PlasmoMessaging } from '@plasmohq/messaging';
import { sendToContentScript } from "@plasmohq/messaging";

export type GetCubeStateRequest = {};

export type GetCubeStateResponse = {
  connected: boolean;
  state: string;
};

const handler: PlasmoMessaging.MessageHandler<
  GetCubeStateRequest,
  GetCubeStateResponse
> = async (req, res) => {
  try {
    // Call the content script function to get the cube state
    const response = await sendToContentScript({
      name: "getCubeState"
    });
    
    res.send({
      connected: response?.connected || false,
      state: response?.state || ""
    });
  } catch (error) {
    console.error("Error in getCubeState handler:", error);
    res.send({
      connected: false,
      state: ""
    });
  }
};

export default handler;