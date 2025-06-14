import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ports } from ".."
import nacl from "tweetnacl"

export type HandleRegisterRequest = {
  publicKey: CredentialCreationOptions["publicKey"]
  url: string
}

export type HandleRegisterResponse = {
  credential: any
  success: boolean
  error?: string
}

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

// Simplified CBOR encoder for WebAuthn
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
      
      let header;
      if (size < 24) {
        header = [0xa0 + size];
      } else if (size < 256) {
        header = [0xb8, size];
      } else {
        header = [0xb9, (size >> 8) & 0xff, size & 0xff];
      }
      
      const parts = [new Uint8Array(header)];
      for (const [k, v] of entries) {
        parts.push(encodeCBOR(k));
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

// Convert JWK to COSE-encoded ES256 public key
function coseES256PubKey(jwk: JsonWebKey): Uint8Array {
  return encodeCBOR(new Map<number, number | Uint8Array>([
    [1, 2],                          // kty: EC2
    [3, -7],                         // alg: ES256
    [-1, 1],                         // crv: P-256
    [-2, b64url.decode(jwk.x!)],    // x
    [-3, b64url.decode(jwk.y!)],    // y
  ]));
}

// Secret key for additional entropy (store this securely in production)
const SECRET_KEY = "your-secret-key-here-replace-with-secure-value"

// Function to generate deterministic key pair from cube state and secret
async function generateKeyPairFromCube(cubeNum: string, secret: string): Promise<{ keyPair: CryptoKeyPair, credId: Uint8Array }> {
  // Combine cube hex string and secret for entropy
  const entropy = `${cubeNum}-${secret}`
  
  // Create a seed from the entropy
  const encoder = new TextEncoder()
  const entropyBytes = encoder.encode(entropy)
  
  // Generate a deterministic seed using SHA-256
  const seedBuffer = await crypto.subtle.digest('SHA-256', entropyBytes)
  
  // Convert hex cube string to bytes for additional entropy
  const cubeBytes = new Uint8Array(cubeNum.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
  
  // Combine the hash with cube bytes
  const combinedEntropy = new Uint8Array(seedBuffer.byteLength + cubeBytes.length)
  combinedEntropy.set(new Uint8Array(seedBuffer), 0)
  combinedEntropy.set(cubeBytes, seedBuffer.byteLength)
  
  // Take first 32 bytes as seed for TweetNaCl (nacl.sign.seedLength = 32)
  const seed = combinedEntropy.slice(0, 32)
  
  // Use seed for credential ID (deterministic)
  const credId = seed.slice(0, 32);
  
  // Generate deterministic Ed25519 key pair using TweetNaCl
  // Comment out the line below to switch to WebCrypto (which doesn't support custom seeds)
  const naclKeyPair = nacl.sign.keyPair.fromSeed(seed);

  naclKeyPair.secretKey
  
  // For WebCrypto (uncomment to use - note: this won't be deterministic):
  
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  
  return { keyPair, credId };
}

// WebAuthn credential generator
async function createFakeCredentialIntercept(options: any, cubeNum: string) {
  // The challenge and user.id come as arrays from serialization
  const challenge = new Uint8Array(options.challenge);
  const rpId = options.rp.id || "webauthn.io";
  const userId = new Uint8Array(options.user.id);
  
  // Generate key pair from cube state
  const { keyPair, credId } = await generateKeyPairFromCube(cubeNum, SECRET_KEY);
  const { publicKey, privateKey } = keyPair;

  // Export public key as JWK and convert to COSE format
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  const coseKey = coseES256PubKey(jwk);

  // Create authenticator data
  const rpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
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
    origin: "https://webauthn.io", // Use the actual origin
    crossOrigin: false
  }));

  // Create attestation object
  const attestationObject = encodeCBOR(new Map<string, string | Map<any, any> | Uint8Array>([
    ['fmt', 'none'],
    ['attStmt', new Map()],
    ['authData', authData]
  ]));

  // Create and return credential - this must be serializable!
  // rawId should be the raw bytes, id should be base64url encoded version of the same bytes
  return {
    type: "public-key",
    rawId: Array.from(credId), // Convert to array for serialization
    id: b64url.encode(credId),
    response: {
      clientDataJSON: Array.from(clientDataJSON), // Convert to array for serialization
      attestationObject: Array.from(attestationObject) // Convert to array for serialization
    }
  };
}

const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    const opened = await ports.sendToTarget(
      "openAuthDialog",
      {
        publicKey: req.body.publicKey
      },
      {
        url: req.body.url
      },
      true
    )

    if (!opened) {
      throw new Error("Failed to connect to the isolated content script")
    }
    
    // Wait for the user to set the cube and for the ui to send over the cube number
    let unsubscribe: () => void | undefined = undefined;
    const cubeNum = await new Promise<string>((resolve) => {
      unsubscribe = ports.registerHandler("auth", async (data) => {
        resolve(data.cubeNum);
        return { success: true };
      });
    });
    
    // Unsubscribe from the handler once we have the cube number
    unsubscribe?.();

    console.log("⏳ Creating WebAuthn credential with cube state:", cubeNum);
    
    // Create WebAuthn credential using the cube state
    const credential = await createFakeCredentialIntercept(req.body.publicKey!, cubeNum);
    
    console.log("✅ Generated credential with cube state:", cubeNum);
    
    // TODO: Save the keypair and site URL to the synced storage
    
    res.send({
      credential: credential,
      success: true
    })
    
  } catch (error) {
    console.error("❌ Error handling registration:", error)
    res.send({
      credential: null,
      success: false,
      error: String(error)
    })
  }
}

export default handler