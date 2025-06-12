import { BTCube } from "gan-i3-356-bluetooth"
import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useRef, useState } from "react"
import { cubeSVG } from "sr-visualizer"

import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import "./style.css"

import {
  useMessageHandler
} from "@/contents-helpers/port-messaging/hooks"

export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start"
}

const Dialog = () => {
  const btCube = useRef(new BTCube())
  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  )
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  )

  const frontCubeRef = useRef<HTMLDivElement>()
  const backCubeRef = useRef<HTMLDivElement>()

  const convertCubeFormat = useCallback((cubeString: string): string => {
    const colorMap: Record<string, string> = {
      U: "w", // Up face = white
      R: "r", // Right face = red
      F: "b", // Front face = blue
      D: "y", // Down face = yellow
      L: "o", // Left face = orange
      B: "g" // Back face = green
    }

    return cubeString
      .split("")
      .map((face) => colorMap[face] || face)
      .join("")
  }, [])

  useEffect(() => {
    if (frontCubeRef.current) {
      frontCubeRef.current.innerHTML = ""
      cubeSVG(
        frontCubeRef.current,
        `r=x-270y-225x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [frontCubeRef.current, facelets, convertCubeFormat])

  useEffect(() => {
    if (backCubeRef.current) {
      backCubeRef.current.innerHTML = ""
      cubeSVG(
        backCubeRef.current,
        `r=x-90y-135x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [backCubeRef.current, facelets, convertCubeFormat])

  // Handler for authentication requests
  useMessageHandler(
    "connectCube",
    async () => {
      // Check if this is an authentication notification
      let result: boolean | undefined
      setShowAuthDialog(true)
      try {
        await btCube.current.init(macAddress)
        result = btCube.current.isConnected()
      } catch (e) {
        console.error("Failed to initialize Bluetooth Cube:", e)
      }

      setShowAuthDialog(false)
      return { result }
    },
    [macAddress]
  )

  useEffect(() => {
    const listener = (data) => {
      setFacelets(data.facelet as string)
    }

    btCube.current.on("cubeStateChanged", listener)

    return () => {
      btCube.current.stop()
      btCube.current.off("cubeStateChanged", listener)
    }
  }, [btCube.current])

  // Handle authentication confirmation
  const handleAuthConfirm = async () => {
    try {
      // Use the window.cubeAuth API to authenticate
      // TODO: send back to the background script
    } catch (error) {
      console.error("Authentication error:", error)
    } finally {
      // Close the dialog regardless of result
      setShowAuthDialog(false)
    }
  }

  return (
    <>
      {/* Authentication Dialog */}
      {showAuthDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <Card className="w-96 p-6 bg-white rounded-lg shadow-lg flex flex-col">
            <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
            <p className="mb-6">
              The website is requesting authentication using your Rubik's Cube.
              Please solve the cube pattern to authenticate.
            </p>
            <div>
              Cube {btCube.current.isConnected() ? "Connected" : "Disconnected"}
            </div>

            <div className="flex w-full cube-container">
              <div ref={frontCubeRef as any} className="flex-1" />
              <div ref={backCubeRef as any} className="flex-1" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAuthDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAuthConfirm}>Authenticate</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export default Dialog;
