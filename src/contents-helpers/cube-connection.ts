import { getPort } from "@plasmohq/messaging/port"
import { BTCube } from "gan-i3-356-bluetooth"

/**
 * Class to manage the connection to a Bluetooth Rubik's Cube
 */
export class CubeConnection {
  private cube: BTCube | null = null
  private cubeConnected: boolean = false
  private lastCubeState: string = ""
  private authPort = getPort("cubeAuth")
  private static instance: CubeConnection | null = null

  /**
   * Get the singleton instance of CubeConnection
   */
  public static getInstance(): CubeConnection {
    if (!CubeConnection.instance) {
      CubeConnection.instance = new CubeConnection()
    }
    return CubeConnection.instance
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    console.log("Rubik's cube connection handler initialized in isolated context")
    this.initialize()
    this.setupPortListener()
    this.setupContentScriptListeners()
  }

  /**
   * Connect to the cube with the given MAC address
   */
  public async connectToCube(macAddress: string): Promise<boolean> {
    if (this.cubeConnected) return true
    
    try {
      console.log("Attempting to connect to cube with MAC:", macAddress)
      this.cube = new BTCube()
      await this.cube.init(macAddress)
      
      this.cube.on("cubeStateChanged", (state) => {
        console.log("Cube state changed:", state)
        this.lastCubeState = state
        // We don't send updates to background on every state change
        // The state will be sent only when requested
      })
      
      this.cubeConnected = true
      console.log("Cube connected successfully")
      return true
    } catch (error) {
      console.error("Failed to connect to cube:", error)
      this.cube = null
      this.cubeConnected = false
      return false
    }
  }

  /**
   * Disconnect from the cube
   */
  public async disconnectCube(): Promise<boolean> {
    if (!this.cubeConnected || !this.cube) return true
    
    try {
      // Implement disconnect logic here
      // This will depend on the BTCube implementation
			this.cube.clearAllListeners();
			this.cube.stop();
      this.cube = null
      this.cubeConnected = false
      this.lastCubeState = ""
      console.log("Cube disconnected successfully")
      return true
    } catch (error) {
      console.error("Failed to disconnect from cube:", error)
      return false
    }
  }

  /**
   * Get the current state of the cube
   */
  public getCurrentCubeState(): { connected: boolean; state: string } {
    return {
      connected: this.cubeConnected,
      state: this.lastCubeState
    }
  }

  /**
   * Initialize by getting the MAC address from storage and connecting to the cube
   */
  private async initialize(): Promise<void> {
    try {
      const storage = new Storage()
      const macAddress = await storage.get("macAddress")
      
      if (macAddress) {
        await this.connectToCube(macAddress)
      } else {
        console.log("No MAC address found in storage")
      }
    } catch (error) {
      console.error("Error initializing cube connection:", error)
    }
  }

  /**
   * Set up the port listener for authentication
   */
  private setupPortListener(): void {
    // Listen for messages on the port
    this.authPort.onMessage.addListener(async (msg) => {
      console.log("Received message on cubeAuth port:", msg)
      
      try {
        // Handle different message types
        switch (msg.action) {
          case "authenticate":
            const storage = new Storage();
            const mac = await storage.get("macAddress");
            if(!mac) {
              throw new Error("No MAC address found in storage for authentication");
            }

            const res = await this.connectToCube(mac);
            if(!res) {
              throw new Error("Failed to connect to cube");
            }

            // TODO: need to show the user some kind of interface to show the cube state, and give them a btn to press
            
          
            // Send the current cube state for authentication
            // this.authPort.postMessage({
            //   action: "authenticate",
            //   success: true,
            //   state: this.getCurrentCubeState(),
            //   challenge: msg.challenge
            // })
            break
            
          default:
            this.authPort.postMessage({
              success: false,
              error: `Unknown action: ${msg.action}`
            })
        }
      } catch (error) {
        // TODO: surface errors to user
        console.error("Error handling port message:", error)
        this.authPort.postMessage({
          success: false,
          error: String(error)
        })
      }
    })

    console.log("Cube authentication port listener initialized")
  }

  /**
   * Set up listeners for content script messages
   */
  private setupContentScriptListeners(): void {
    // Listen for getCubeState messages
    document.addEventListener("getCubeState", (event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent.detail || {}
      
      // Respond with the current cube state
      const response = this.getCurrentCubeState()
      
      // Send the response back
      const responseEvent = new CustomEvent("getCubeStateResponse", {
        detail: response
      })
      document.dispatchEvent(responseEvent)
    })

    // Listen for connectCube messages
    document.addEventListener("connectCube", async (event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent.detail || {}
      const macAddress = detail.macAddress
      
      let success = false
      let error = ""
      
      try {
        if (!macAddress) {
          throw new Error("No MAC address provided")
        }
        
        // Connect to the cube
        success = await this.connectToCube(macAddress)
        
        if (!success) {
          throw new Error("Failed to connect to cube")
        }
      } catch (err) {
        error = String(err)
        console.error("Error connecting to cube:", err)
      }
      
      // Send the response back
      const responseEvent = new CustomEvent("connectCubeResponse", {
        detail: { success, error }
      })
      document.dispatchEvent(responseEvent)
    })

    // Listen for disconnectCube messages
    document.addEventListener("disconnectCube", async (event) => {
      let success = false
      let error = ""
      
      try {
        // Disconnect from the cube
        success = await this.disconnectCube()
        
        if (!success) {
          throw new Error("Failed to disconnect from cube")
        }
      } catch (err) {
        error = String(err)
        console.error("Error disconnecting from cube:", err)
      }
      
      // Send the response back
      const responseEvent = new CustomEvent("disconnectCubeResponse", {
        detail: { success, error }
      })
      document.dispatchEvent(responseEvent)
    })
  }
}
