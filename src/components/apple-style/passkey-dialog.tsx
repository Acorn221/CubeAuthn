import {
  useMessageHandler,
  useSendMessage
} from "@/contents-helpers/port-messaging"
import { BTCube } from "gan-i3-356-bluetooth"
import { UserLock } from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { cubeSVG } from "sr-visualizer"
import { useStorage } from "@plasmohq/storage/hook"
import RubiksCubeIcon from "./rubiks-cube-icon"
import "./apple-style.css"
import type { CubeHashConfig, PublicKeyCredentialRequestOptionsSerialized } from "@/background/types"
import { checkHash, generateHash } from "../../utils"

const PasskeyDialog: React.FC = () => {
  const btCube = useRef(new BTCube())
  const [isConnected, setIsConnected] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [publicRegisterKey, setRegisterPublicKey] = useState<
    CredentialCreationOptions["publicKey"] | undefined
  >();
  const [publicAuthKey, setAuthPublicKey] = useState<
    PublicKeyCredentialRequestOptionsSerialized | undefined
  >();
  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  )
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  );

  const [cubeScrambleHash] = useStorage<CubeHashConfig>(
    "fixedCubeScrambleHash"
  )
  

  const frontCubeRef = useRef<HTMLDivElement>()
  const backCubeRef = useRef<HTMLDivElement>()

  const sendRegister = useSendMessage("register");
  const sendAuth = useSendMessage("auth");

  // Handle closing the dialog and resetting state
  const handleCloseDialog = useCallback(() => {
    setShowAuthDialog(false)
    setConnectionFailed(false)
    setIsConnected(false)
    setAuthPublicKey(undefined)
    setRegisterPublicKey(undefined)
  }, [])

  // Handler for authentication requests
  useMessageHandler(
    "registerDialog",
    async (req) => {
      let result: boolean | undefined
      setShowAuthDialog(true)
      setRegisterPublicKey(req.publicKey)
      try {
        await btCube.current.init(macAddress)
        result = btCube.current.isConnected()
        setIsConnected(result)
        setFacelets(btCube.current.getCube().facelets)
        console.log(`Result ${result} for MAC: ${macAddress}`)
      } catch (e) {
        console.error("Failed to initialize Bluetooth Cube:", e)
        setConnectionFailed(true)
      }

      return { result }
    },
    [macAddress, setFacelets, setIsConnected]
  );

  useMessageHandler(
    "authDialog",
    async (req) => {
      // TODO: HANDLE AUTHENTICATION
      // TODO: CHECK THE CUBE SCRAMBLE HASH IF PRESENT
      setAuthPublicKey(req.publicKey)
      setShowAuthDialog(true)

    }
  )

  const checkCubeScrambleAgainstHash = useCallback(
    async () => {
      if (!cubeScrambleHash) {
        console.log("No cube scramble hash configured, skipping check.");
        return true; // No hash set, assume valid
      }

      const cube = btCube.current.getCube();
      const cubeNum = cube.getStateHex();

      const hash = await checkHash(cubeNum, cubeScrambleHash);

      console.log(`Hash result:  ${hash} for cube state: ${cubeNum}`);
      return hash;
    },
    [cubeScrambleHash, facelets]
  );

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
  }, [frontCubeRef.current, facelets, convertCubeFormat, isConnected])

  useEffect(() => {
    if (backCubeRef.current) {
      backCubeRef.current.innerHTML = ""
      cubeSVG(
        backCubeRef.current,
        `r=x-90y-135x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [backCubeRef.current, facelets, convertCubeFormat, isConnected])

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

  // Handle authentication confirmation
  const handleAuthConfirm = async () => {
    try {
      const cubeNum = btCube.current.getCube().getStateHex()
      const isScrambleValid = await checkCubeScrambleAgainstHash()
      if(!isScrambleValid) {
        // TODO: Show an error message to the user
        throw new Error("Cube scramble does not match the expected hash.")
      }
      btCube.current.stop()

      const res = await sendRegister({
        cubeNum,
        // getting the origin from the isolated cs for security
        origin: window.location.origin,
      })

      if (res.success) {
        // Success animation could be added here
        handleCloseDialog()
      }
    } catch (error) {
      console.error("Authentication error:", error)
    }
  }

  return (
    <>
      {showAuthDialog && (
        <div
          className="fixed inset-0 apple-dialog-backdrop flex items-center justify-center z-[9999] apple-dialog"
          onClick={handleCloseDialog}>
          <div
            className="w-[360px] apple-dialog-container text-white rounded-lg shadow-xl overflow-hidden flex flex-col gap-2 p-4"
            onClick={(e) => e.stopPropagation()} // Prevent clicks on the dialog from closing it
          >
            {/* Header with Sign In text and Cancel button */}
            <div className="flex cursor-default">
              <div className="flex-1 top-4 flex items-center">
                <UserLock className="size-6" />
                <span className="text-md font-medium ml-2">Sign In</span>
              </div>
              <div>
                <button
                  onClick={handleCloseDialog}
                  className="px-3 py-1 rounded-md bg-[#3a3a3c] text-white text-sm font-normal cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
            <div className="w-full h-[1px] bg-[#3a3a3c] mb-2" />
            {/* Content */}
            <div className="px-4 flex flex-col items-center cursor-default">
              <div className="w-14 h-14 apple-dialog-icon-container flex items-center justify-center mb-4">
                <RubiksCubeIcon className="w-14 h-14" />
              </div>

              <h2 className="text-lg apple-dialog-title mb-1">
                Use CubeAuthn to sign in?
              </h2>

              {publicRegisterKey && (
                <p className="apple-dialog-description text-center text-xs mb-2">
                  A passkey will be created for "{publicRegisterKey.user.displayName}" on this extension and synced with
                  your google account.
                </p>
              )}
              {
                publicAuthKey && (
                  <></>
                  //  TODO SHOW THE POTENTIAL LOGINS FROM THE STORAGE AND AVAILABLE LOGIN METHODS FROM publicAuthKey.allowCredentials
                )
              }

              {isConnected && (
                <div className="w-full flex cube-container mb-2">
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
                  onClick={handleAuthConfirm}
                  className="w-full py-3 rounded-md bg-[#0071e3] text-white font-medium text-sm">
                  Confirm Scramble
                </button>
              ) : connectionFailed ? (
                <button
                  onClick={() => {
                    setConnectionFailed(false)
                    btCube.current.init(macAddress)
                  }}
                  className="w-full py-3 rounded-md bg-[#3a3a3c] text-white font-medium text-sm">
                  Connect to Cube
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PasskeyDialog
