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

// Secret key for additional entropy (store this securely in production)
const SECRET_KEY = "your-secret-key-here-replace-with-secure-value"

// Function to generate deterministic key pair from cube state and secret
async function generateKeyPairFromCube(cubeNum: string, secret: string): Promise<CryptoKeyPair> {
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
  
  // Generate deterministic Ed25519 key pair using TweetNaCl
  const keyPair = nacl.sign.keyPair.fromSeed(seed)
  
  // Convert to Web Crypto API format if needed
  const webCryptoKeyPair = {
    publicKey: await crypto.subtle.importKey(
      "raw",
      keyPair.publicKey,
      {
        name: "Ed25519"
      },
      true,
      ["verify"]
    ),
    privateKey: await crypto.subtle.importKey(
      "raw", 
      keyPair.secretKey.slice(0, 32), // Ed25519 secret key is first 32 bytes
      {
        name: "Ed25519"
      },
      true,
      ["sign"]
    )
  }
  
  return webCryptoKeyPair
}

// Function to create WebAuthn credential response
async function createCredentialResponse(
  publicKey: CredentialCreationOptions["publicKey"],
  keyPair: CryptoKeyPair,
  cubeNum: string
): Promise<any> {
  // Export the public key
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey)
  
  // Create a mock credential ID (in production, this should be more sophisticated)
  const credentialId = new Uint8Array(32)
  crypto.getRandomValues(credentialId)
  
  // Create attestation object (simplified for demo)
  const attestationObject = {
    fmt: "none",
    attStmt: {},
    authData: new Uint8Array(37) // Simplified auth data
  }
  
  // Create client data JSON
  const challengeBuffer = publicKey?.challenge || new ArrayBuffer(32)
  let challengeArray: Uint8Array
  
  if (challengeBuffer instanceof ArrayBuffer) {
    challengeArray = new Uint8Array(challengeBuffer)
  } else if (challengeBuffer instanceof SharedArrayBuffer) {
    challengeArray = new Uint8Array(challengeBuffer)
  } else {
    // It's an ArrayBufferView (like Uint8Array, DataView, etc.)
    challengeArray = new Uint8Array(challengeBuffer.buffer, challengeBuffer.byteOffset, challengeBuffer.byteLength)
  }
  
  const clientDataJSON = {
    type: "webauthn.create",
    challenge: Array.from(challengeArray),
    origin: publicKey?.rp?.id || "localhost",
    crossOrigin: false
  }
  
  // The actual WebAuthn credential response structure
  const credential = {
    id: Array.from(credentialId).map(b => b.toString(16).padStart(2, '0')).join(''),
    rawId: credentialId,
    response: {
      attestationObject: new Uint8Array(JSON.stringify(attestationObject).length),
      clientDataJSON: new TextEncoder().encode(JSON.stringify(clientDataJSON)),
      publicKey: new Uint8Array(publicKeyBuffer),
      publicKeyAlgorithm: -7 // ES256
    },
    type: "public-key",
    // Custom field to include cube state for verification
    cubeState: cubeNum
  }
  
  return credential
}

const handler: PlasmoMessaging.MessageHandler<
  HandleRegisterRequest,
  HandleRegisterResponse
> = async (req, res) => {
  try {
    const opened = await ports.sendToTarget(
      "openAuthDialog",
      {},
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

    // Generate key pair from cube state and secret key
    const keyPair = await generateKeyPairFromCube(cubeNum as string, SECRET_KEY)
    
    // Create WebAuthn credential response
    const credential = await createCredentialResponse(
      req.body.publicKey,
      keyPair,
      cubeNum as string
    )
    
    console.log("Generated credential with cube state:", cubeNum)
    
    res.send({
      credential: credential,
      success: true
    })
    
  } catch (error) {
    console.error("Error handling registration:", error)
    res.send({
      credential: null,
      success: false,
      error: String(error)
    })
  }
}

export default handler