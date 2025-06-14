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

// Base64url helpers
const b64url = {
  encode(buffer: ArrayBuffer | Uint8Array | number[]) {
    try {
      // Handle different input types
      let bytes: Uint8Array;
      if (buffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(buffer);
      } else if (buffer instanceof Uint8Array) {
        bytes = buffer;
      } else if (Array.isArray(buffer)) {
        bytes = new Uint8Array(buffer);
      } else {
        bytes = new Uint8Array(buffer || []);
      }
      
      // Convert to binary string and encode
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch (e) {
      console.error("Base64url encoding error:", e);
      return "";
    }
  },
  
  decode(str: string | ArrayBuffer | ArrayBufferView): Uint8Array {
    try {
      // Handle non-string or empty input
      if (!str) return new Uint8Array(0);
      
      // Handle ArrayBuffer/TypedArray directly
      if (typeof str === 'object' && 'byteLength' in str) {
        return new Uint8Array(str as ArrayBuffer);
      }
      
      // Process string input
      const input = String(str);
      const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
      
      // Add padding if needed
      let padded = base64;
      while (padded.length % 4) {
        padded += "=";
      }
      
      // Decode and convert to Uint8Array
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      return bytes;
    } catch (e) {
      // If decoding fails and input is an object with byteLength, treat as binary
      if (typeof str === 'object' && 'byteLength' in str) {
        return new Uint8Array(str as ArrayBuffer);
      }
      console.error("Base64url decoding error:", e);
      return new Uint8Array(0);
    }
  }
};

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
