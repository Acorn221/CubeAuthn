import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ports } from ".."
import nacl from "tweetnacl"
import { Storage } from "@plasmohq/storage"
import { getSecret } from "@/background/utils"

export type HandleRegisterRequest = {
  publicKey: CredentialCreationOptions["publicKey"]
  url: string
}

export type HandleRegisterResponse = {
  credential: WebAuthnCredential | null
  success: boolean
  error?: string
}

/**
 * Base64url encoding/decoding utilities
 */
const b64url = {
  /**
   * Encodes binary data to base64url format
   */
  encode(buffer: ArrayBuffer | Uint8Array | number[]): string {
    try {
      // Convert input to Uint8Array
      const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) 
        : buffer instanceof Uint8Array ? buffer 
        : Array.isArray(buffer) ? new Uint8Array(buffer)
        : new Uint8Array();
      
      // Convert to binary string and encode
      const binary = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
      
      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch (e) {
      console.error("Base64url encoding error:", e);
      return "";
    }
  },
  
  /**
   * Decodes base64url string to binary data
   */
  decode(str: string | ArrayBuffer | ArrayBufferView): Uint8Array {
    try {
      // Handle non-string or empty input
      if (!str) return new Uint8Array(0);
      
      // Handle ArrayBuffer/TypedArray directly
      if (typeof str === 'object' && 'byteLength' in str) {
        return new Uint8Array(str instanceof ArrayBuffer ? str : new Uint8Array(str.buffer));
      }
      
      // Process string input
      const input = String(str);
      const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
      
      // Add padding if needed
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      
      // Decode and convert to Uint8Array
      const binary = atob(padded);
      return Uint8Array.from([...binary].map(char => char.charCodeAt(0)));
    } catch (e) {
      console.error("Base64url decoding error:", e);
      return new Uint8Array(0);
    }
  }
};

/**
 * Simplified CBOR encoder for WebAuthn
 *
 * Note: Using 'any' type here is necessary because of the recursive nature of CBOR data.
 * TypeScript cannot properly type check recursive structures like this without excessive complexity.
 */
function encodeCBOR(val: any): Uint8Array {
  try {
    if (val instanceof Uint8Array) {
      const len = val.length;
      if (len < 24) {
        return new Uint8Array([0x40 + len, ...val]);
      } else if (len < 256) {
        return new Uint8Array([0x58, len, ...val]);
      } else {
        return new Uint8Array([0x59, (len >> 8) & 0xff, len & 0xff, ...val]);
      }
    }
    
    if (typeof val === "string") {
      const strBytes = new TextEncoder().encode(val);
      const len = strBytes.length;
      if (len < 24) {
        return new Uint8Array([0x60 + len, ...strBytes]);
      } else if (len < 256) {
        return new Uint8Array([0x78, len, ...strBytes]);
      } else {
        return new Uint8Array([0x79, (len >> 8) & 0xff, len & 0xff, ...strBytes]);
      }
    }
    
    if (typeof val === "number") {
      if (val >= 0 && val < 24) return new Uint8Array([val]);
      if (val >= 0 && val < 256) return new Uint8Array([0x18, val]);
      if (val < 0 && val > -25) return new Uint8Array([0x20 + Math.abs(val) - 1]);
      return new Uint8Array([val < 0 ? 0x38 : 0x18, Math.abs(val < 0 ? val + 1 : val)]);
    }
    
    if (val instanceof Map) {
      const entries = Array.from(val.entries());
      const size = entries.length;
      
      const header = size < 24 ? [0xa0 + size] 
        : size < 256 ? [0xb8, size] 
        : [0xb9, (size >> 8) & 0xff, size & 0xff];
      
      const parts = [new Uint8Array(header)];
      
      // TypeScript can't handle the recursive nature of this function with complex types
      for (const [k, v] of entries) {
        // @ts-expect-error - Recursive CBOR encoding is too complex for TypeScript to type check
        parts.push(encodeCBOR(k));
        // @ts-expect-error - Recursive CBOR encoding is too complex for TypeScript to type check
        parts.push(encodeCBOR(v));
      }
      
      // Concatenate all parts
      const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
      }
      
      return result;
    }
    
    // Default fallback
    return new Uint8Array([0xa0]); // Empty map
  } catch (e) {
    console.error("CBOR encoding error:", e);
    return new Uint8Array([0xa0]); // Empty map as fallback
  }
}

// Secret key for additional entropy (store this securely in production)
const SECRET_KEY = "your-secret-key-here-replace-with-secure-value";

/**
 * Result of key pair generation
 */
interface KeyPairResult {
  credId: Uint8Array;
  naclKeyPair: nacl.SignKeyPair;
}

/**
 * Generates a deterministic key pair from cube state and secret
 */
const generateKeyPairFromCube = async (cubeNum: string, secret: string): Promise<KeyPairResult> => {
  // Create entropy from cube state and secret
  const entropy = `${cubeNum}-${secret}`;
  const entropyBytes = new TextEncoder().encode(entropy);
  
  // Generate deterministic seed
  const seedBuffer = await crypto.subtle.digest('SHA-256', entropyBytes);
  
  // Convert hex cube string to bytes for additional entropy
  const cubeBytes = new Uint8Array(
    cubeNum.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  
  // Combine the hash with cube bytes
  const combinedEntropy = new Uint8Array(seedBuffer.byteLength + cubeBytes.length);
  combinedEntropy.set(new Uint8Array(seedBuffer), 0);
  combinedEntropy.set(cubeBytes, seedBuffer.byteLength);
  
  // Take first 32 bytes as seed for TweetNaCl
  const seed = combinedEntropy.slice(0, 32);
  
  // Generate deterministic Ed25519 key pair
  const naclKeyPair = nacl.sign.keyPair.fromSeed(seed);
  
  // Generate credential ID by hashing the public key
  const credIdBuffer = await crypto.subtle.digest('SHA-256', naclKeyPair.publicKey);
  const credId = new Uint8Array(credIdBuffer);
  
  return { credId, naclKeyPair };
}

/**
 * WebAuthn credential response
 */
interface WebAuthnCredential {
  type: string;
  rawId: number[];
  id: string;
  response: {
    clientDataJSON: number[];
    attestationObject: number[];
  };
}

/**
 * Creates a fake WebAuthn credential using the cube state
 */
const createFakeCredentialIntercept = async ({
  publicKey,
  cubeNum,
  secret,
}: {
  publicKey: PublicKeyCredentialCreationOptions,
  cubeNum: string,
  secret: string
}): Promise<WebAuthnCredential> => {
  // Extract challenge and relying party info
  const challenge = new Uint8Array(publicKey.challenge as ArrayBuffer);
  const rpId = publicKey.rp.id || "webauthn.io";
  
  // Generate key pair from cube state
  const { credId, naclKeyPair } = await generateKeyPairFromCube(cubeNum, secret);

  // Create a custom COSE key from the nacl public key
  const coseMap = new Map<number, number | Uint8Array>([
    [1, 2],                                      // kty: EC2
    [3, -7],                                     // alg: ES256
    [-1, 1],                                     // crv: P-256
    [-2, naclKeyPair.publicKey.slice(0, 32)],    // x: first 32 bytes of nacl public key
    [-3, naclKeyPair.publicKey.slice(0, 32)],    // y: first 32 bytes of nacl public key
  ]);
  
  const coseKey = encodeCBOR(coseMap);

  // Create authenticator data
  const rpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))
  );
  const flags = Uint8Array.of(0x41); // user present + attested credential data
  const signCount = Uint8Array.of(0, 0, 0, 0);
  const aaguid = new Uint8Array(16);
  const credIdLen = Uint8Array.of(credId.length >> 8, credId.length & 0xff);
  
  const authData = new Uint8Array([
    ...rpIdHash,
    ...flags,
    ...signCount,
    ...aaguid,
    ...credIdLen,
    ...credId,
    ...coseKey,
  ]);

  // Create client data JSON
  const clientDataJSON = new TextEncoder().encode(JSON.stringify({
    type: "webauthn.create",
    challenge: b64url.encode(challenge),
    origin: "https://webauthn.io",
    crossOrigin: false
  }));

  // Create attestation object
  const attestationMap = new Map<string, string | Map<string, unknown> | Uint8Array<ArrayBuffer>>([
    ['fmt', 'none'],
    ['attStmt', new Map()],
    ['authData', authData]
  ]);
  
  const attestationObject = encodeCBOR(attestationMap);

  // Create and return credential
  return {
    type: "public-key",
    rawId: Array.from(credId),
    id: b64url.encode(credId),
    response: {
      clientDataJSON: Array.from(clientDataJSON),
      attestationObject: Array.from(attestationObject)
    }
  };
}

/**
 * Handles WebAuthn registration requests
 */
const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    // Open the authentication dialog
    const opened = await ports.sendToTarget(
      "openAuthDialog",
      { publicKey: req.body.publicKey },
      { url: req.body.url },
      true
    );

    if (!opened) {
      throw new Error("Failed to connect to the isolated content script");
    }
    
    // Wait for the user to set the cube and for the UI to send the cube number
    let unsubscribe: (() => void) | undefined;
    const cubeNum = await new Promise<string>((resolve) => {
      unsubscribe = ports.registerHandler("auth", async (data) => {
        resolve(data.cubeNum);
        return { success: true };
      });
    });
    
    // Unsubscribe from the handler
    unsubscribe?.();

    console.log("⏳ Creating WebAuthn credential with cube state:", cubeNum);

    const storage = new Storage({ area: "sync" });
    
    // Create WebAuthn credential using the cube state
    const credential = await createFakeCredentialIntercept({
      publicKey: req.body.publicKey,
      cubeNum,
      secret: await getSecret(storage),
    });
    
    console.log("✅ Generated credential with cube state:", cubeNum);
    
    // TODO: Save the keypair and site URL to the synced storage
    
    res.send({
      credential,
      success: true
    });
    
  } catch (error) {
    console.error("❌ Error handling registration:", error);
    res.send({
      credential: null,
      success: false,
      error: String(error)
    });
  }
};

export default handler;