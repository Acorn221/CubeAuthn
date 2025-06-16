import type { CubeHashConfig } from "@/background/types";
import nacl from "tweetnacl";
import { ITERATIONS } from "./defaults";

/**
 * Generate a random salt
 */
export const generateSalt = (): Uint8Array => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return array;
};

/**
 * Convert array to hex string
 */
export const arrayToHex = (array: Uint8Array): string => {
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash the cube state with PBKDF2
 */
export const hashWithPBKDF2 = async (
  data: string, 
  salt: Uint8Array,
): Promise<string> => {
  // Convert data to bytes
  const dataBytes = new TextEncoder().encode(data);
  
  // Import as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    dataBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-512'
    },
    keyMaterial,
    512 // 64 bytes output
  );
  
  // Convert to hex string
  const hashArray = new Uint8Array(derivedBits);
  return arrayToHex(hashArray);
};

/**
 * Generate hash from cube state using PBKDF2
 */
export const generateHash = async (
  cubeNum: string,
  setCubeScrambleHash: (config: CubeHashConfig) => void,
): Promise<string> => {
  try {
    // Use stored iterations if available and valid, otherwise calculate
    // Generate a random salt
    const saltBytes = generateSalt();
    const salt = arrayToHex(saltBytes);
    
    // Hash the cube state with PBKDF2
    const hash = await hashWithPBKDF2(cubeNum, saltBytes);
    
    // Save the hash configuration
    setCubeScrambleHash({
      iterations: ITERATIONS,
      salt,
      hash
    });

    return hash;
  } catch (error) {
    console.error("Error generating hash:", error);
    return "";
  }
};


interface KeyPairResult {
  credId: Uint8Array;
  naclKeyPair: nacl.SignKeyPair;
  credIdString: string;
}

export const generateKeyPairFromCube = async (
  cubeNum: string,
  secret: string, // Make this required
  credId?: string, // Optional for regeneration
): Promise<KeyPairResult> => {
  // Generate a cryptographically secure random ID if not provided
  const finalCredId = credId || generateSecureRandomId();
  
  // Create a strong key derivation input
  const keyMaterial = `${cubeNum}:${secret}`;
  const keyMaterialBytes = new TextEncoder().encode(keyMaterial);
  
  // Use PBKDF2 for key derivation (more secure than simple hashing)
  const salt = new TextEncoder().encode(finalCredId);
  
  // Import key material for PBKDF2
  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterialBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  // Derive 32 bytes using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-512"
    },
    importedKey,
    256 // 32 bytes
  );
  
  const seed = new Uint8Array(derivedBits);
  
  // Generate deterministic Ed25519 key pair
  const naclKeyPair = nacl.sign.keyPair.fromSeed(seed);
  
  // Generate credential ID from public key + random ID for uniqueness
  const credIdInput = new Uint8Array(naclKeyPair.publicKey.length + finalCredId.length);
  credIdInput.set(naclKeyPair.publicKey, 0);
  credIdInput.set(new TextEncoder().encode(finalCredId), naclKeyPair.publicKey.length);
  
  const credIdEncoded = new TextEncoder().encode(finalCredId);
  
  return {
    credIdString: finalCredId,
    credId: credIdEncoded, 
    naclKeyPair,
  };
};


export const generateSecureRandomId = (): string => {
  // Generate 16 bytes of secure random data
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  // Convert to base64url for safe storage/transmission
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};
