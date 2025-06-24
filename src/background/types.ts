import type { MessageDefinitions } from "./port-messaging-api"

export interface InboundMessages {
  register: {
    request: { cubeNum: string; origin: string }
    response: { success: boolean }
  }
  auth: {
    request: { cubeNum: string; origin: string, keyId: string }
    response: { success: boolean }
  }
  getData: {
    request: { id: string }
    response: { data: string[] }
  }
}

export interface OutboundMessages {
  updateSettings: {
    request: { theme: "dark" | "light" }
    response: { applied: boolean }
  }
  notify: {
    request: { message: string; type: "info" | "error" }
    response: { acknowledged: boolean }
  }
  connectCube: {
    request: {}
    response: { result: boolean } // using string bc it's a big number
  }
  registerDialog: {
    request: {
      publicKey: PublicKeyCredentialCreationOptionsSerialized
    }
    response: {}
  }
  authDialog: {
    request: {
        publicKey: PublicKeyCredentialRequestOptionsSerialized
    }
    response: {}
  }

  getCubeStateNumber: {
    request: {}
    response: { num: string } // using string bc it's a big number
  }
}

export type SerializablePublicKeyCredential = {
  id: string
  type: string
  rawId: string // ArrayBuffer -> base64
  authenticatorAttachment: string | null
  transports?: string[]
  response: {
    clientDataJSON: string // ArrayBuffer -> base64
    // For AuthenticatorAttestationResponse
    attestationObject?: string // ArrayBuffer -> base64
    authenticatorData?: string // ArrayBuffer -> base64
    publicKey?: string | null // ArrayBuffer -> base64
    publicKeyAlgorithm?: number
    // For AuthenticatorAssertionResponse
    signature?: string // ArrayBuffer -> base64
    userHandle?: string | null // ArrayBuffer -> base64
  }
  clientExtensionResults: {
    appid?: boolean
    credProps?: {
      rk?: boolean
    }
    hmacCreateSecret?: boolean
    prf?: {
      enabled?: boolean
      results?: {
        first: string // BufferSource -> base64
        second?: string // BufferSource -> base64
      }
    }
  }
}

/**
 * Represents a stored WebAuthn credential for a site
 * Contains only the data needed for verification, NOT private keys or cube state
 */
export interface StoredWebAuthnCredential {
  // Unique identifier for this credential
  id: string

  // The site URL this credential is for
  siteUrl: string

  // The origin of the site (e.g., https://example.com)
  origin: string

  // The base64url-encoded public key
  publicKey: string

  // Relying Party ID
  rpId: string

  // User information from the credential
  user: {
    id: string
    name: string
    displayName: string
  }

  // When this credential was created
  createdAt: number
}

export type CubeHashConfig =
  | {
      iterations: number
      salt: string
      hash: string
    }
  | undefined

/**
 * WebAuthn credential response
 */
export interface WebAuthnCredential {
  type: string
  rawId: number[]
  id: string,
  transports?: string[]
  response: {
    clientDataJSON: number[]
    attestationObject?: number[]
    authenticatorData?: number[]
    signature?: number[]
    userHandle?: number[] | null
  },
  authenticatorAttachment?: string | null
  clientExtensionResults?: {
    credProps: {
      rk: boolean;
    }
  }
}

export type PublicKeyCredentialRequestOptionsSerialized = Pick<
  PublicKeyCredentialRequestOptions,
  "rpId" | "timeout" | "allowCredentials" | "extensions" | "userVerification"
> & {
  challenge: number[]
}

export type PublicKeyCredentialCreationOptionsSerialized = Pick<
    PublicKeyCredentialCreationOptions,
    | "user"
    | "challenge"
    | "pubKeyCredParams"
    | "timeout"
    | "excludeCredentials"
    | "authenticatorSelection"
    | "attestation"
    | "extensions"
    > & {
    rp: {
        id: string
        name: string
        }
    challenge: number[]
    attestationFormat?: string
    extensions?: Record<string, any>
    };

