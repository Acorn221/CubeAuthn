import type { PlasmoMessaging } from '@plasmohq/messaging';
import { sendToContentScript } from "@plasmohq/messaging";

export type DisconnectCubeRequest = {};

export type DisconnectCubeResponse = {
  success: boolean;
  error?: string;
};

const handler: PlasmoMessaging.MessageHandler<
  DisconnectCubeRequest,
  DisconnectCubeResponse
> = async (req, res) => {
  try {
    // Call the content script function to disconnect from the cube
    const response = await sendToContentScript({
      name: "disconnectCube"
    });
    
    res.send({
      success: response?.success || false,
      error: response?.error
    });
  } catch (error) {
    console.error("Error in disconnectCube handler:", error);
    res.send({
      success: false,
      error: String(error)
    });
  }
};

export default handler;