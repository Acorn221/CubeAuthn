import type { PlasmoCSConfig } from "plasmo"
import { sendToBackgroundViaRelay } from "@plasmohq/messaging"
import type { HandleRegisterResponse, HandleRegisterRequest } from "@/background/messages/handleRegister";

export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start",
  world: "MAIN",
}

// Store the original credential methods
const originalCredentialCreate = navigator.credentials.create.bind(navigator.credentials);
// const originalCredentialGet = navigator.credentials.get.bind(navigator.credentials);

// Create a proxy for the credentials.create method
navigator.credentials.create = async function(options: CredentialCreationOptions): Promise<Credential | null> {
  console.log("WebAuthn credential creation intercepted", options);
  
  // Check if this is a WebAuthn request
  if (options?.publicKey) {
    console.log("Sending msg to background script for WebAuthn registration");
    // TODO: send message to bgsw handleRegister
    const res = await sendToBackgroundViaRelay<HandleRegisterRequest, HandleRegisterResponse>({
      name: "handleRegister",
      body: {
        publicKey: options.publicKey,
        url: window.location.href
      }
    });

    console.log("WebAuthn registration response:", res);
    return null;
  }

  console.warn("No publicKey in options");
  return null;
  
  // Call the original method
  // return originalCredentialCreate(options);
};

// // Create a proxy for the credentials.get method
// navigator.credentials.get = async function(options: CredentialRequestOptions): Promise<Credential | null> {
//   console.log("WebAuthn credential request intercepted", options);
  
//   // Check if this is a WebAuthn request
//   if (options?.publicKey) {
//     try {
//       // Try to connect to the cube
//       const connected = await connectToCube();
      
//       if (connected) {
//         console.log("Using Rubik's cube for WebAuthn authentication");
        
//         // TODO: Modify the publicKey options with cube-derived key material
//         // This is where you would modify the challenge or user verification
        
//         // For now, we'll just log that we're intercepting
//         console.log("Modifying WebAuthn authentication with Rubik's cube data");
        
//         // Generate key material from cube
//         const keyMaterial = generateKeyFromCube();
        
//         // TODO: Incorporate keyMaterial into the credential authentication process
//         // This might involve modifying the challenge or other parameters
//       } else {
//         console.log("Cube not connected, proceeding with original WebAuthn flow");
//       }
//     } catch (error) {
//       console.error("Error in WebAuthn interception:", error);
//     }
//   }
  
//   // Call the original method
//   return originalCredentialGet(options);
// };

console.log("WebAuthn interception initialized");
