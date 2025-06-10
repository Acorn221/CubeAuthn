import type { PlasmoCSConfig } from "plasmo"
import { BTCube } from "gan-i3-356-bluetooth";

export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start",
  world: "MAIN",
}

// Store the original credential methods
const originalCredentialCreate = navigator.credentials.create.bind(navigator.credentials);
const originalCredentialGet = navigator.credentials.get.bind(navigator.credentials);

// Initialize the cube connection
let cube: BTCube | null = null;
let cubeConnected = false;

// Function to connect to the cube
async function connectToCube(): Promise<boolean> {
  if (cubeConnected) return true;
  
  try {
    cube = new BTCube();
    await cube.init("");
    
    cube.on("cubeStateChanged", (state) => {
      console.log("Cube state changed:", state);
      // Store the cube state for use in key generation
    });
    
    cubeConnected = true;
    return true;
  } catch (error) {
    console.error("Failed to connect to cube:", error);
    cube = null;
    cubeConnected = false;
    return false;
  }
}

// Function to generate key material from cube state
function generateKeyFromCube() {
  // TODO: Implement key generation from cube state
  // This will be used to modify the private key for WebAuthn
  
  // Placeholder: Return a random value for now
  return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
}

// Create a proxy for the credentials.create method
navigator.credentials.create = async function(options: CredentialCreationOptions): Promise<Credential | null> {
  console.log("WebAuthn credential creation intercepted", options);
  
  // Check if this is a WebAuthn request
  if (options?.publicKey) {
    try {
      // Try to connect to the cube
      const connected = await connectToCube();
      
      if (connected) {
        console.log("Using Rubik's cube for WebAuthn");
        
        // TODO: Modify the publicKey options with cube-derived key material
        // This is where you would modify the challenge or user verification
        
        // For now, we'll just log that we're intercepting
        console.log("Modifying WebAuthn request with Rubik's cube data");
        
        // Generate key material from cube
        const keyMaterial = generateKeyFromCube();
        
        // TODO: Incorporate keyMaterial into the credential creation process
        // This might involve modifying the challenge or other parameters
      } else {
        console.log("Cube not connected, proceeding with original WebAuthn flow");
      }
    } catch (error) {
      console.error("Error in WebAuthn interception:", error);
    }
  }
  
  // Call the original method
  return originalCredentialCreate(options);
};

// Create a proxy for the credentials.get method
navigator.credentials.get = async function(options: CredentialRequestOptions): Promise<Credential | null> {
  console.log("WebAuthn credential request intercepted", options);
  
  // Check if this is a WebAuthn request
  if (options?.publicKey) {
    try {
      // Try to connect to the cube
      const connected = await connectToCube();
      
      if (connected) {
        console.log("Using Rubik's cube for WebAuthn authentication");
        
        // TODO: Modify the publicKey options with cube-derived key material
        // This is where you would modify the challenge or user verification
        
        // For now, we'll just log that we're intercepting
        console.log("Modifying WebAuthn authentication with Rubik's cube data");
        
        // Generate key material from cube
        const keyMaterial = generateKeyFromCube();
        
        // TODO: Incorporate keyMaterial into the credential authentication process
        // This might involve modifying the challenge or other parameters
      } else {
        console.log("Cube not connected, proceeding with original WebAuthn flow");
      }
    } catch (error) {
      console.error("Error in WebAuthn interception:", error);
    }
  }
  
  // Call the original method
  return originalCredentialGet(options);
};

console.log("WebAuthn interception initialized");
