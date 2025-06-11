import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';
import { sendToContentScript } from "@plasmohq/messaging";

export type ConnectCubeRequest = {
  macAddress?: string;
};

export type ConnectCubeResponse = {
  success: boolean;
  error?: string;
};

const handler: PlasmoMessaging.MessageHandler<
  ConnectCubeRequest,
  ConnectCubeResponse
> = async (req, res) => {
  try {
    // Get the MAC address from the request or from storage
    let macAddress = req.body?.macAddress;
    
    if (!macAddress) {
      // If no MAC address provided, try to get it from storage
      const storage = new Storage();
      macAddress = await storage.get("macAddress");
      
      if (!macAddress) {
        throw new Error("No MAC address provided or found in storage");
      }
    }
    
    // Call the content script function to connect to the cube
    const response = await sendToContentScript({
      name: "connectCube",
      body: { macAddress }
    });
    
    res.send({
      success: response?.success || false,
      error: response?.error
    });
  } catch (error) {
    console.error("Error in connectCube handler:", error);
    res.send({
      success: false,
      error: String(error)
    });
  }
};

export default handler;