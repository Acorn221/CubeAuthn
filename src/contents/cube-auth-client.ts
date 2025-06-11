import type { PlasmoCSConfig } from "plasmo"
import { sendToBackgroundViaRelay } from "@plasmohq/messaging"

export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start",
  world: "MAIN" // Using MAIN world to interact with the webpage
}

// Function to initialize the cube authentication client
function initCubeAuthClient() {
  // Add a global function to the window object for the webpage to use
  window.cubeAuth = {
    // Connect to the cube
    async connect(macAddress?: string) {
      try {
        const response = await sendToBackgroundViaRelay({
          name: "connectCube",
          body: { macAddress }
        })
        return response
      } catch (error) {
        console.error("Error connecting to cube:", error)
        return { success: false, error: String(error) }
      }
    },

    // Disconnect from the cube
    async disconnect() {
      try {
        const response = await sendToBackgroundViaRelay({
          name: "disconnectCube"
        })
        return response
      } catch (error) {
        console.error("Error disconnecting from cube:", error)
        return { success: false, error: String(error) }
      }
    },

    // Get the current cube state
    async getState() {
      try {
        const response = await sendToBackgroundViaRelay({
          name: "getCubeState"
        })
        return response
      } catch (error) {
        console.error("Error getting cube state:", error)
        return { connected: false, state: "", error: String(error) }
      }
    },

    // Use the cube for authentication
    async authenticate(challenge: string, options: any) {
      try {
        const response = await sendToBackgroundViaRelay({
          name: "handleAuthentication",
          body: { challenge, options }
        })
        return response
      } catch (error) {
        console.error("Error authenticating with cube:", error)
        return { success: false, error: String(error) }
      }
    },

    // Use the cube for registration
    async register(challenge: string, options: any) {
      try {
        const response = await sendToBackgroundViaRelay({
          name: "handleRegister",
          body: { challenge, options }
        })
        return response
      } catch (error) {
        console.error("Error registering with cube:", error)
        return { success: false, error: String(error) }
      }
    }
  }

  // Notify the webpage that the cube authentication client is ready
  const event = new CustomEvent("cubeAuthReady")
  window.dispatchEvent(event)

  console.log("Cube authentication client initialized")
}

// Initialize the cube authentication client
initCubeAuthClient()

// Declare the cubeAuth interface on the window object for TypeScript
declare global {
  interface Window {
    cubeAuth: {
      connect: (macAddress?: string) => Promise<any>
      disconnect: () => Promise<any>
      getState: () => Promise<any>
      authenticate: (challenge: string, options: any) => Promise<any>
      register: (challenge: string, options: any) => Promise<any>
    }
  }
}