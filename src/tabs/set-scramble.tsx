import "./styles.css"
import { BTCube } from "gan-i3-356-bluetooth"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { cubeSVG } from "sr-visualizer"
import { useStorage } from "@plasmohq/storage/hook"
import RubiksCubeIcon from "@/components/apple-style/rubiks-cube-icon"
import { Lock } from "lucide-react"

import "@/components/apple-style/apple-style.css"
import type { CubeHashConfig } from "@/background/types"

const SetScramble = () => {
  const btCube = useRef(new BTCube())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  )
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  )
	const [cubeScrambleHash, setCubeScrambleHash] = useStorage<CubeHashConfig>(
		"fixedCubeScrambleHash"
	);

  const frontCubeRef = useRef<HTMLDivElement>()
  const backCubeRef = useRef<HTMLDivElement>()

  // Connect to the cube
  const connectToCube = useCallback(async () => {
    setConnectionFailed(false)
    try {
      await btCube.current.init(macAddress)
      const result = btCube.current.isConnected()
      setIsConnected(result)
      if (result) {
        setFacelets(btCube.current.getCube().facelets)
      }
      console.log(`Connection result: ${result} for MAC: ${macAddress}`)
      return result
    } catch (e) {
      console.error("Failed to initialize Bluetooth Cube:", e)
      setConnectionFailed(true)
      return false
    }
  }, [macAddress])

  // Generate hash from cube state (placeholder for now)
  const generateHash = useCallback(() => {
    if (!isConnected) return ""
    
    // This is just a placeholder - actual hash generation will be implemented later
    const cubeNum = btCube.current.getCube().getStateHex();
		// TODO: calculate how many iterations we can do under 50ms of sha-512
		// TODO: Then save the hash iterations and the "cubeScrambleHash" in the storage
		// TODO: save the `setCubeScrambleHash` with the hash and iterations
		// TODO: let the user download HTML of the hash, iterations and SVG (and cube state num)
    return cubeNum
  }, [isConnected])

  // Handle confirmation of the scramble
  const handleConfirmScramble = useCallback(() => {
    if (!isConnected) return;
    
    const hash = generateHash();
    console.log("Confirmed scramble with hash:", hash);
    
    // Here you would typically save the hash or use it for authentication
    // This is a placeholder for now
    
    // Optionally disconnect the cube after confirmation
    // btCube.current.stop()
  }, [isConnected, generateHash]);

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

  // Initialize connection on component mount
  useEffect(() => {
    connectToCube()
    
    return () => {
      // Clean up on unmount
      if (btCube.current) {
        btCube.current.stop()
      }
    }
  }, [connectToCube])

  // Render front cube view
  useEffect(() => {
    if (frontCubeRef.current) {
      frontCubeRef.current.innerHTML = ""
      cubeSVG(
        frontCubeRef.current,
        `r=x-270y-225x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [frontCubeRef.current, facelets, convertCubeFormat, isConnected])

  // Render back cube view
  useEffect(() => {
    if (backCubeRef.current) {
      backCubeRef.current.innerHTML = ""
      cubeSVG(
        backCubeRef.current,
        `r=x-90y-135x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [backCubeRef.current, facelets, convertCubeFormat, isConnected])

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
            <span className="text-lg font-medium ml-2">Set your Scramble</span>
          </div>
        </div>
        <div className="w-full h-[1px] bg-[#3a3a3c] mb-2" />
        
        {/* Content */}
        <div className="px-4 flex flex-col items-center cursor-default">
          <div className="w-14 h-14 apple-dialog-icon-container flex items-center justify-center mb-4">
            <RubiksCubeIcon className="w-14 h-14" />
          </div>

          <h2 className="text-lg apple-dialog-title mb-1">
            Set Cube Scramble
          </h2>

          <p className="apple-dialog-description text-center text-xs mb-4">
            Connect your Rubik's Cube and set the scramble pattern that will be used for authentication.
          </p>

          {isConnected && (
            <div className="w-full flex cube-container mb-4">
              <div ref={frontCubeRef as any} className="flex-1" />
              <div ref={backCubeRef as any} className="flex-1" />
            </div>
          )}

          {!isConnected && !connectionFailed && (
            <div className="text-center my-4 text-xs text-[#8e8e93]">
              Connecting to the Cube...
            </div>
          )}

          {isConnected ? (
            <button
              onClick={handleConfirmScramble}
              className="w-full py-3 rounded-md bg-[#0071e3] text-white font-medium text-sm">
              Confirm Scramble
            </button>
          ) : connectionFailed ? (
            <button
              onClick={connectToCube}
              className="w-full py-3 rounded-md bg-[#3a3a3c] text-white font-medium text-sm">
              Connect to Cube
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default SetScramble