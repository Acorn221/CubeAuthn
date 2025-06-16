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

// Helper function to convert our serialized credential to a proper WebAuthn PublicKeyCredential
function createWebAuthnCredential(credentialData: any): any {
  // Convert arrays back to ArrayBuffers
  const rawIdBuffer = new Uint8Array(credentialData.rawId).buffer;
  
  // Create the credential object that matches the actual PublicKeyCredential interface
  const credential = {
    id: credentialData.id, // This should already be base64url encoded
    type: "public-key",
    rawId: rawIdBuffer,
    response: {
      clientDataJSON: new Uint8Array(credentialData.response.clientDataJSON).buffer,
      attestationObject: new Uint8Array(credentialData.response.attestationObject).buffer,
    },
    
    getClientExtensionResults() {
      return {};
    },
  };

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
      
      // Convert BufferSource fields to arrays for serialization
      const publicKeyForSerialization = {
        ...options.publicKey,
        challenge: Array.from(new Uint8Array(
          options.publicKey.challenge instanceof ArrayBuffer
            ? options.publicKey.challenge
            : options.publicKey.challenge.buffer
        )),
        user: {
          ...options.publicKey.user,
          id: Array.from(new Uint8Array(
            options.publicKey.user.id instanceof ArrayBuffer
              ? options.publicKey.user.id
              : options.publicKey.user.id.buffer
          ))
        }
      };
      
      const res = await sendToBackgroundViaRelay<HandleRegisterRequest, HandleRegisterResponse>({
        name: "handleRegister",
        body: {
          publicKey: publicKeyForSerialization as any, // Type assertion needed for serialization
          url: window.location.href
        }
      });

      console.log("WebAuthn registration response:", res);
      
      // Handle the response
      if (res.success && res.credential) {
        console.log("Successfully created WebAuthn credential with cube state");
        
        // Convert the serialized credential to a proper WebAuthn credential object
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


console.log("WebAuthn interception initialized");
