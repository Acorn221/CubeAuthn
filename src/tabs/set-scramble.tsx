import "./set-scramble/styles.css"

import RubiksCubeIcon from "@/components/apple-style/rubiks-cube-icon"
import { BTCube } from "gan-i3-356-bluetooth"
import { AlertTriangle, ChevronLeft, Lock, X } from "lucide-react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cubeSVG } from "sr-visualizer"

import { useStorage } from "@plasmohq/storage/hook"

import "@/components/apple-style/apple-style.css"

import type {
  CubeHashConfig,
  StoredWebAuthnCredential
} from "@/background/types"
import { createDownloadableHTML, generateHash } from "@/utils/set-scramble"

import { Button } from "../components/ui/button"

const SetScramble = () => {
  const btCube = useRef(new BTCube())
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isGeneratingHash, setIsGeneratingHash] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string>("")
  const [showDoneScreen, setShowDoneScreen] = useState(false)

  // Handle closing the tab
  const handleClose = useCallback(() => {
    window.close()
  }, [])

  // Use the storage hook to get WebAuthn credentials
  const [webAuthnCredentials] = useStorage<
    StoredWebAuthnCredential[]
  >("webauthn_credentials")

  // Use useMemo to calculate derived state
  const credentialCount = useMemo(() => {
    console.log(`WebAuthn credentials:`, webAuthnCredentials)
    return (webAuthnCredentials || []).length
  }, [webAuthnCredentials])

  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  )
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  )

  const [cubeScrambleHash, setCubeScrambleHash] = useStorage<CubeHashConfig>(
    "fixedCubeScrambleHash"
  )

  // Store the calculated PBKDF2 iterations to avoid recalculating
  const [targetIterations, setTargetIterations] = useStorage<
    number | undefined
  >("targetIterations")

  const frontCubeRef = useRef<HTMLDivElement>()
  const backCubeRef = useRef<HTMLDivElement>()

  // Connect to the cube
  const connectToCube = useCallback(async () => {
    let result = false
    setIsConnecting(true)
    try {
      await btCube.current.init(macAddress)
      result = btCube.current.isConnected()
      setIsConnected(result)
      if (result) {
        setFacelets(btCube.current.getCube().facelets)
      }
      console.log(`Connection result: ${result} for MAC: ${macAddress}`)
    } catch (e) {
      console.error("Failed to initialize Bluetooth Cube:", e)
    } finally {
      setIsConnecting(false)
    }

    return result
  }, [macAddress])

  // Generate hash wrapper function
  const generateCubeHash = useCallback(async () => {
    if (!isConnected) return ""

    const cubeNum = btCube.current.getCube().getStateHex()
    return await generateHash(
      cubeNum,
      setCubeScrambleHash,
      targetIterations,
      setTargetIterations
    )
  }, [isConnected, setCubeScrambleHash, targetIterations, setTargetIterations])

  // Handle download of the HTML file
  const handleDownload = useCallback(() => {
    if (!htmlContent) return

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "rubiks-cube-auth.html"
    document.body.appendChild(a)
    a.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }, [htmlContent])

  // Handle confirmation of the scramble
  const handleConfirmScramble = useCallback(async () => {
    if (!isConnected || isGeneratingHash) return

    try {
      setIsGeneratingHash(true)

      // Generate the hash
      const hash = await generateCubeHash()

      if (!cubeScrambleHash) {
        console.error("Failed to generate hash configuration")
        setIsGeneratingHash(false)
        return
      }

      console.log("Confirmed scramble with hash:", hash)

      // Get the cube state number
      const cubeNum = btCube.current.getCube().getStateHex()

      // Get the SVG content from both cube visualizations
      const frontSvg = frontCubeRef.current?.innerHTML || ""
      const backSvg = backCubeRef.current?.innerHTML || ""

      // Create HTML content but don't download automatically
      const html = createDownloadableHTML(
        cubeScrambleHash.hash,
        cubeScrambleHash.iterations,
        cubeScrambleHash.salt,
        cubeNum,
        frontSvg,
        backSvg
      )

      // Save the HTML content for later download
      setHtmlContent(html)

      // Set success state
      setShowDoneScreen(true)

      // Optionally disconnect the cube after confirmation
      // btCube.current.stop()
    } catch (error) {
      console.error("Error confirming scramble:", error)
    } finally {
      setIsGeneratingHash(false)
    }
  }, [
    isConnected,
    isGeneratingHash,
    generateCubeHash,
    cubeScrambleHash,
    createDownloadableHTML
  ])

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

  // Render a single cube view
  const renderCubeView = useCallback(
    (
      ref: React.MutableRefObject<HTMLDivElement | undefined>,
      rotation: string
    ) => {
      if (ref.current) {
        ref.current.innerHTML = ""
        cubeSVG(
          ref.current,
          `r=${rotation}&size=300&fc=${convertCubeFormat(facelets)}` as any
        )
      }
    },
    [facelets, convertCubeFormat]
  )

  // Render both cube views
  const renderCubeViews = useCallback(() => {
    renderCubeView(frontCubeRef, "x-270y-225x-20")
    renderCubeView(backCubeRef, "x-90y-135x-20")
  }, [renderCubeView, frontCubeRef, backCubeRef])

  // Unified effect to render cube views when needed
  useEffect(() => {
    if (isConnected) {
      renderCubeViews()
    }
  }, [isConnected, renderCubeViews, showDoneScreen, facelets])

  // Listen for cube state changes
  useEffect(() => {
    const listener = (data) => {
      setIsConnected(true)
      setFacelets(data.facelet as string)
    }

    btCube.current.on("cubeStateChanged", listener)

    return () => {
      btCube.current.off("cubeStateChanged", listener)
    }
  }, [btCube.current, macAddress])

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="w-[360px] apple-dialog-container text-white rounded-lg shadow-xl overflow-hidden flex flex-col gap-2 p-4">
        {/* Header */}
        <div className="flex cursor-default">
          <div className="flex-1 top-4 flex items-center">
            <Lock className="size-4" />
            <span className="text-lg font-medium ml-2">
              {showDoneScreen ? "Scramble Saved" : "Set your Scramble"}
            </span>
          </div>
          <Button onClick={handleClose} variant="outline" size="sm">
            <X className="size-5" />
          </Button>
        </div>
        <div className="w-full h-[1px] bg-[#3a3a3c] mb-2" />

        {/* Content */}
        {!showDoneScreen ? (
          <div className="px-4 flex flex-col items-center cursor-default">
            <div className="w-14 h-14 apple-dialog-icon-container flex items-center justify-center mb-4">
              <RubiksCubeIcon className="w-14 h-14" />
            </div>

            <h2 className="text-lg apple-dialog-title mb-1">
              Set Cube Scramble
            </h2>

            <p className="apple-dialog-description text-center text-xs mb-4">
              Connect your Rubik's Cube and set the scramble pattern that will
              be used for authentication.
            </p>

            {isConnected && (
              <div className="w-full flex cube-container mb-4">
                <div ref={frontCubeRef as any} className="flex-1" />
                <div ref={backCubeRef as any} className="flex-1" />
              </div>
            )}

            {isConnecting && (
              <div className="text-center my-4 text-xs text-[#8e8e93]">
                Connecting to the Cube...
              </div>
            )}

            {cubeScrambleHash && (
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-md p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="text-blue-500 size-4 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <p className="font-medium mb-1">Existing Scramble Detected</p>
                  <p>
                    You already have a saved cube scramble. Changing it will
                    replace your current scramble configuration.
                  </p>
                  {/* TODO: Add option to export existing scramble before changing */}
                </div>
              </div>
            )}

            {credentialCount > 0 && (
              <div className="bg-amber-900/30 border border-amber-500/50 rounded-md p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="text-amber-500 size-4 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-200">
                  <p className="font-medium mb-1">
                    Warning: Existing Passkeys Detected
                  </p>
                  <p>
                    You have {credentialCount} existing passkey
                    {credentialCount !== 1 ? "s" : ""} that use the current cube
                    scramble. Changing the scramble will make these passkeys
                    unusable.
                  </p>
                  {/* TODO: Implement a migration flow to update existing passkeys with the new scramble */}
                  {/* TODO: Add option to export existing passkeys before changing scramble */}
                  {/* TODO: Add confirmation dialog before proceeding with scramble change */}
                </div>
              </div>
            )}

            {isConnected ? (
              <button
                onClick={handleConfirmScramble}
                disabled={isGeneratingHash || credentialCount > 0}
                className={`w-full py-3 rounded-md ${
                  credentialCount > 0
                    ? "bg-[#3a3a3c] cursor-not-allowed"
                    : isGeneratingHash
                      ? "bg-[#0071e3]/50"
                      : "bg-[#0071e3]"
                } text-white font-medium text-sm`}>
                {isGeneratingHash
                  ? "Generating Hash..."
                  : credentialCount > 0
                    ? "Cannot Change Scramble"
                    : "Confirm Scramble"}
              </button>
            ) : (
              <button
                onClick={connectToCube}
                className={`w-full py-3 rounded-md  ${isConnecting ? "bg-[#3a3a3c]" : "bg-[#0071e3]"} text-white font-medium text-sm`}>
                Connect to Cube
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 flex flex-col items-center cursor-default">
            <div className="w-14 h-14 apple-dialog-icon-container flex items-center justify-center mb-4 bg-green-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-lg apple-dialog-title mb-1">
              Scramble Saved Successfully
            </h2>

            <p className="apple-dialog-description text-center text-xs mb-4">
              Your cube scramble has been saved and can now be used for
              authentication.
            </p>

            <div className="flex w-full gap-2 mb-3">
              <button
                onClick={() => setShowDoneScreen(false)}
                className="py-3 px-4 rounded-md bg-[#3a3a3c] text-white font-medium text-sm flex items-center">
                <ChevronLeft className="size-4 mr-1" />
                Back
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-md bg-[#0071e3] text-white font-medium text-sm">
                Download Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SetScramble
