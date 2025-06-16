import type { PlasmoMessaging } from '@plasmohq/messaging';
import { sendToContentScript } from "@plasmohq/messaging";
import type { PublicKeyCredentialRequestOptionsSerialized } from '../types';

export type HandleAuthenticationRequest = {
  publicKey: PublicKeyCredentialRequestOptionsSerialized;
};

export type HandleAuthenticationResponse = {
  credential: any;
  success: boolean;
  error?: string;
};

const handler: PlasmoMessaging.MessageHandler<
  HandleAuthenticationRequest,
  HandleAuthenticationResponse
> = async (req, res) => {
  try {
    // Get the current cube state
    const cubeStateResponse = await sendToContentScript({
      name: "getCubeState"
    });
    
    if (!cubeStateResponse.connected) {
      throw new Error("Cube is not connected");
    }
    
    const cubeState = cubeStateResponse.state;
    console.log("Using cube state for authentication:", cubeState);
    
    // Modify the authentication challenge based on the cube state
    // This is where you would implement your custom logic to incorporate
    // the cube state into the WebAuthn authentication process
    
    // For now, we'll just pass through the original request
    // In a real implementation, you would modify the challenge or other parameters
    
    // res.send({
    //   credential: req.body.options,
    //   success: true
    // });

    throw new Error("TMP")
  } catch (error) {
    console.error("Error handling authentication:", error);
    res.send({
      credential: null,
      success: false,
      error: String(error)
    });
  }
};

export default handler;