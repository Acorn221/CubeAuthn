// === Minimal WebAuthn Credential Generator (ES256 with WebCrypto) ===

// Base64url helpers
const b64url = {
  encode(buffer) {
    try {
      // Handle different input types
      let bytes;
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
  
  decode(str) {
    try {
      // Handle non-string or empty input
      if (!str) return new Uint8Array(0);
      
      // Handle ArrayBuffer/TypedArray directly
      if (typeof str === 'object' && str.byteLength !== undefined) {
        return new Uint8Array(str);
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
      if (typeof str === 'object' && str.byteLength !== undefined) {
        return new Uint8Array(str);
      }
      console.error("Base64url decoding error:", e);
      return new Uint8Array(0);
    }
  }
};

// Simplified CBOR encoder for WebAuthn
function encodeCBOR(val) {
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
function coseES256PubKey(jwk) {
  return encodeCBOR(new Map([
    [1, 2],                          // kty: EC2
    [3, -7],                         // alg: ES256
    [-1, 1],                         // crv: P-256
    [-2, b64url.decode(jwk.x)],      // x
    [-3, b64url.decode(jwk.y)],      // y
  ]));
}

// WebAuthn credential generator
async function createFakeCredentialIntercept(options) {
  // Decode challenge and user ID
  const challenge = b64url.decode(options.challenge);
  const rpId = options.rp.id;
  const userId = b64url.decode(options.user.id);
  const credId = crypto.getRandomValues(new Uint8Array(32));

  // Generate key pair
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );

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
    origin: location.origin,
    crossOrigin: false
  }));

  // Create attestation object
  const attestationObject = encodeCBOR(new Map([
    ['fmt', 'none'],
    ['attStmt', new Map()],
    ['authData', authData]
  ]));

  // Create and return credential
  return {
    type: "public-key",
    rawId: credId.buffer,
    id: b64url.encode(credId),
    response: {
      clientDataJSON,
      attestationObject
    },
    getClientExtensionResults: function() {
      return {}; // No extensions supported
    }
  };
}

// Monkeypatch WebAuthn
navigator.credentials.create = async (opts) => {
  if (opts?.publicKey) {
    console.log("⏳ Intercepting WebAuthn Registration...");
    try {
      const result = await createFakeCredentialIntercept(opts.publicKey);
      console.log("✅ WebAuthn Registration completed successfully");
      return result;
    } catch (e) {
      console.error("❌ WebAuthn Registration failed:", e);
      throw e;
    }
  } else {
    throw new Error("Only publicKey registration supported");
  }
};

console.log("🔒 WebAuthn API intercepted successfully");
