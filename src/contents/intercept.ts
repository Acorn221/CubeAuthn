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

// Helper function to convert our credential format to a proper WebAuthn PublicKeyCredential
function createWebAuthnCredential(credentialData: any): PublicKeyCredential {
  // Create the credential object that matches the actual PublicKeyCredential interface
  const credential = {
    id: credentialData.id,
    type: "public-key",
    rawId: credentialData.rawId instanceof ArrayBuffer ? credentialData.rawId : credentialData.rawId.buffer,
    authenticatorAttachment: null,
    response: {
      clientDataJSON: credentialData.response.clientDataJSON instanceof ArrayBuffer 
        ? credentialData.response.clientDataJSON 
        : credentialData.response.clientDataJSON.buffer,
      // attestationObject: credentialData.response.attestationObject,
    } satisfies AuthenticatorResponse,
    
    getClientExtensionResults(): AuthenticationExtensionsClientOutputs {
      return {};
    },
    
    toJSON() {
      return {
        id: credentialData.id,
        rawId: credentialData.id,
        type: "public-key",
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(this.response.clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credentialData.response.attestationObject))),
        }
      };
    },
  } satisfies PublicKeyCredential;

  return credential;
}

// Create a proxy for the credentials.create method
navigator.credentials.create = async function(options: CredentialCreationOptions): Promise<Credential | null> {
  console.log("WebAuthn credential creation intercepted", options);
  
  // Check if this is a WebAuthn request
  if (options?.publicKey) {
    console.log("Sending msg to background script for WebAuthn registration");
    
    try {
      console.log(`PUBLIC KEY`, options.publicKey);
      const res = await sendToBackgroundViaRelay<HandleRegisterRequest, HandleRegisterResponse>({
        name: "handleRegister",
        body: {
          publicKey: options.publicKey,
          url: window.location.href
        }
      });

      console.log("WebAuthn registration response:", res);
      
      // Handle the response
      if (res.success && res.credential) {
        console.log("Successfully created WebAuthn credential with cube state:", res.credential.cubeState);
        
        // Convert our credential data to a proper WebAuthn PublicKeyCredential
        const webauthnCredential = createWebAuthnCredential(res.credential);
        
        return webauthnCredential;
      } else {
        // Handle error case
        console.error("WebAuthn registration failed:", res.error);
        
        // Throw a proper WebAuthn error
        const error = new DOMException(
          res.error || "Registration failed",
          "NotAllowedError"
        );
        throw error;
      }
      
    } catch (error) {
      console.error("Error during WebAuthn registration:", error);
      
      // Re-throw as a WebAuthn-compatible error
      if (error instanceof DOMException) {
        throw error;
      } else {
        throw new DOMException(
          "An error occurred during registration",
          "UnknownError"
        );
      }
    }
  }

  console.warn("No publicKey in options, falling back to original method");
  
  // Fall back to original method for non-WebAuthn requests
  return originalCredentialCreate(options);
};

console.log("WebAuthn content script loaded and credential.create method intercepted");
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
