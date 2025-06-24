import type {
  HandleAuthenticationRequest,
  HandleAuthenticationResponse
} from "@/background/messages/handleAuthentication"
import type {
  HandleRegisterRequest,
  HandleRegisterResponse
} from "@/background/messages/handleRegister"
import type { PublicKeyCredentialCreationOptionsSerialized, PublicKeyCredentialRequestOptionsSerialized } from "@/background/types"
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
function createWebAuthnCredential(credentialData: any): any {
  const rawIdBuffer = new Uint8Array(credentialData.rawId).buffer

  const response: any = {
    ...credentialData.response,
    clientDataJSON: new Uint8Array(credentialData.response.clientDataJSON).buffer,
  }

  // Add attestationObject for registration responses
  if (credentialData.response.attestationObject) {
    response.attestationObject = new Uint8Array(
      credentialData.response.attestationObject
    ).buffer
  }

  // Add authenticatorData for authentication responses
  if (credentialData.response.authenticatorData) {
    response.authenticatorData = new Uint8Array(
      credentialData.response.authenticatorData
    ).buffer
  }

  if (credentialData.response.signature) {
    response.signature = new Uint8Array(
      credentialData.response.signature
    ).buffer
  }

  if (credentialData.response.userHandle !== undefined) {
    response.userHandle = credentialData.response.userHandle ?
      new Uint8Array(credentialData.response.userHandle).buffer : null
  }
  
  if (credentialData.response.transports) {
    response.transports = credentialData.response.transports
  }

  const credential = {
    id: credentialData.id,
    type: "public-key",
    rawId: rawIdBuffer,
    response,

    getClientExtensionResults() {
      return {}
    }
  }

  return credential
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
      };

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
