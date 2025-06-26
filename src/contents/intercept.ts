import type {
  HandleAuthenticationRequest,
  HandleAuthenticationResponse
} from "@/background/messages/handleAuthentication"
import type {
  HandleRegisterRequest,
  HandleRegisterResponse
} from "@/background/messages/handleRegister"
import type {
  PublicKeyCredentialCreationOptionsSerialized,
  PublicKeyCredentialRequestOptionsSerialized
} from "@/background/types"
import type { PlasmoCSConfig } from "plasmo"

import { sendToBackgroundViaRelay } from "@plasmohq/messaging"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  world: "MAIN"
}

/**
 * Converts a serialized credential back to a proper WebAuthn PublicKeyCredential
 *
 * @param credentialData - The serialized credential data from the background script
 * @returns A WebAuthn-compatible credential object
 */
/**
 * Converts a serialized credential back to a proper WebAuthn PublicKeyCredential
 *
 * @param credentialData - The serialized credential data from the background script
 * @returns A WebAuthn-compatible credential object
 */
function createWebAuthnCredential(credentialData: any): any {
  // Safely extract top-level properties with fallbacks
  const id = credentialData.id
  const rawId = credentialData.rawId || []
  const authenticatorAttachment = credentialData.authenticatorAttachment
  const responseData = credentialData.response || {}

  console.log("TRANSPORTS CRED DATA", credentialData.transports);

  // Create buffer from rawId
  const rawIdBuffer = new Uint8Array(rawId).buffer

  // Create the response object with proper buffer conversions and fallbacks
  const response: any = {
    // Handle buffer conversions safely
    authenticatorData: responseData.authenticatorData
      ? new Uint8Array(responseData.authenticatorData).buffer
      : null,

    attestationObject: responseData.attestationObject
      ? new Uint8Array(responseData.attestationObject).buffer
      : null,

    signature: responseData.signature
      ? new Uint8Array(responseData.signature).buffer
      : null,

    // clientDataJSON should always be present
    clientDataJSON: responseData.clientDataJSON
      ? new Uint8Array(responseData.clientDataJSON).buffer
      : new Uint8Array([]).buffer
  }

  // Add userHandle if present
  if (responseData.userHandle !== undefined) {
    response.userHandle = responseData.userHandle
      ? new Uint8Array(responseData.userHandle).buffer
      : null
  }

  // Return the complete credential object
  return {
    authenticatorAttachment: authenticatorAttachment || null,
    id,
    type: "public-key",
    rawId: rawIdBuffer,
    response,
    clientExtensionResults: credentialData.clientExtensionResults || {"credProps": {"rk": true}},
    ...(credentialData.response.transports && { transports: credentialData.response.transports }),
    getClientExtensionResults() {
      return credentialData.clientExtensionResults || {"credProps": {"rk": true}}
    },
    publicKeyAlgorithm: responseData.publicKeyAlgorithm || null,
  }
}

// Store references to the original WebAuthn methods
const originalCredentialCreate = navigator.credentials.create.bind(
  navigator.credentials
)
const originalCredentialGet = navigator.credentials.get.bind(
  navigator.credentials
)

/**
 * Override for navigator.credentials.create to intercept WebAuthn registration requests
 */
navigator.credentials.create = async function (
  options: CredentialCreationOptions
): Promise<Credential | null> {
  if (options?.publicKey) {
    try {
      // Serialize the publicKey options for message passing
      const publicKeyForSerialization = {
        ...options.publicKey,
        challenge: Array.from(
          new Uint8Array(
            options.publicKey.challenge instanceof ArrayBuffer
              ? options.publicKey.challenge
              : options.publicKey.challenge.buffer
          )
        ),
        user: {
          ...options.publicKey.user,
          id: Array.from(
            new Uint8Array(
              options.publicKey.user.id instanceof ArrayBuffer
                ? options.publicKey.user.id
                : options.publicKey.user.id.buffer
            )
          )
        }
      }

      const res = await sendToBackgroundViaRelay<
        HandleRegisterRequest,
        HandleRegisterResponse
      >({
        name: "handleRegister",
        body: {
          publicKey: publicKeyForSerialization as any, // TODO: fix types
          url: window.location.href
        }
      })

      if (res.success && res.credential) {
        // Convert the serialized credential to a proper WebAuthn credential object
        const webauthnCredential = createWebAuthnCredential(res.credential)

        return webauthnCredential
      } else {
        // Handle error case
        console.error("WebAuthn registration failed:", res.error)

        // Throw a proper WebAuthn error
        const error = new DOMException(
          res.error || "Registration failed",
          "NotAllowedError"
        )
        throw error
      }
    } catch (error) {
      console.error("Error during WebAuthn registration:", error)

      // Re-throw as a WebAuthn-compatible error
      if (error instanceof DOMException) {
        throw error
      } else {
        throw new DOMException(
          "An error occurred during registration",
          "UnknownError"
        )
      }
    }
  }

  // Fall back to original method for non-WebAuthn requests
  return originalCredentialCreate(options)
}

/**
 * Override for navigator.credentials.get to intercept WebAuthn authentication requests
 */
navigator.credentials.get = async function (
  options: CredentialRequestOptions
): Promise<Credential | null> {
  if (options?.publicKey) {
    try {
      // Serialize the publicKey options for message passing
      const publicKeyForSerialization = {
        ...options.publicKey,
        challenge: Array.from(
          new Uint8Array(
            options.publicKey.challenge instanceof ArrayBuffer
              ? options.publicKey.challenge
              : options.publicKey.challenge.buffer
          )
        )
      } satisfies PublicKeyCredentialRequestOptionsSerialized

      const res = await sendToBackgroundViaRelay<
        HandleAuthenticationRequest,
        HandleAuthenticationResponse
      >({
        name: "handleAuthentication",
        body: {
          publicKey: publicKeyForSerialization,
          url: window.location.href
        }
      })

      if (res.success && res.credential) {
        // Convert the serialized credential to a proper WebAuthn credential object
        const webauthnCredential = createWebAuthnCredential(res.credential)

        return webauthnCredential
      } else {
        // If no passkeys are available, fall back to the original method
        if (res.error?.includes("No passkeys available") || !res.success) {
          return originalCredentialGet(options)
        }

        // Throw a proper WebAuthn error
        const error = new DOMException(
          res.error || "Authentication failed",
          "NotAllowedError"
        )
        throw error
      }
    } catch (error) {
      // Re-throw as a WebAuthn-compatible error
      if (error instanceof DOMException) {
        throw error
      } else {
        throw new DOMException(
          "An error occurred during authentication",
          "UnknownError"
        )
      }
    }
  }

  return originalCredentialGet(options)
}

// WebAuthn interception is now initialized
