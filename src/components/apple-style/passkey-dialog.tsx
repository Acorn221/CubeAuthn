import {
  useMessageHandler,
  useSendMessage
} from "@/contents-helpers/port-messaging"
import { BTCube } from "gan-i3-356-bluetooth"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import "./apple-style.css"

import type {
  CubeHashConfig,
  PublicKeyCredentialRequestOptionsSerialized,
  StoredWebAuthnCredential
} from "@/background/types"

import { checkHash } from "../../utils"
import AuthPasskeyDialog from "./auth-passkey-dialog"
import RegisterPasskeyDialog from "./register-passkey-dialog"

const PasskeyDialog: React.FC = () => {
  const btCube = useRef(new BTCube())
  const [isConnected, setIsConnected] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [isScrambleValid, setIsScrambleValid] = useState(false)
  const [publicRegisterKey, setRegisterPublicKey] = useState<
    CredentialCreationOptions["publicKey"] | undefined
  >()
  const [publicAuthKey, setAuthPublicKey] = useState<
    PublicKeyCredentialRequestOptionsSerialized | undefined
  >()
  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  )
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  )
  const [validCubeNum, setValidCubeNum] = useState<string | null>(null)

  const [cubeScrambleHash] = useStorage<CubeHashConfig>("fixedCubeScrambleHash")

  const [webAuthnCredentials] = useStorage<StoredWebAuthnCredential[]>(
    "webauthn_credentials"
  )

  const relevantCredentials = useMemo(() => {
    if (!webAuthnCredentials) return []
    return webAuthnCredentials.filter(
      (cred) => cred.origin === window.location.origin
    )
  }, [webAuthnCredentials])

  // Handle closing the dialog and resetting state
  const handleCloseDialog = useCallback(() => {
    setShowAuthDialog(false)
    setConnectionFailed(false)
    setIsConnected(false)
    setAuthPublicKey(undefined)
    setRegisterPublicKey(undefined)
    setFacelets("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB")
    setValidCubeNum(null)
    setIsScrambleValid(false)
  }, [])

  // Handler for registration requests
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

      return { result: true }
    },
    [macAddress, setFacelets, setIsConnected]
  )

  // Handler for authentication requests
  useMessageHandler("authDialog", async (req) => {
    setAuthPublicKey(req.publicKey)
    setShowAuthDialog(true)
    setConnectionFailed(true) // Setting connection failed to show the connect btn if the passkey was auto opened
    
    // Try to connect to the cube if we have a MAC address
    if (macAddress) {
      try {
        await btCube.current.init(macAddress)
        const result = btCube.current.isConnected()
        setIsConnected(result)
        if (result) {
          setFacelets(btCube.current.getCube().facelets)
          setConnectionFailed(false)
        }
      } catch (e) {
        console.error("Failed to initialize Bluetooth Cube:", e)
        setConnectionFailed(true)
      }
    }
  }, [macAddress])

  const checkCubeScrambleAgainstHash = useCallback(async () => {
    if (!cubeScrambleHash) {
      console.log("No cube scramble hash configured, skipping check.")
      return true // No hash set, assume valid
    }

    const cube = btCube.current.getCube()
    if (!cube) return false

    const cubeNum = cube.getStateHex()
    const hash = await checkHash(cubeNum, cubeScrambleHash)

    if (hash) {
      setValidCubeNum(cubeNum)
    }

    return hash
  }, [cubeScrambleHash, facelets, isConnected])

  useEffect(() => {
    checkCubeScrambleAgainstHash().then((isValid) => {
      setIsScrambleValid(isValid)
    })
  }, [
    checkCubeScrambleAgainstHash,
    facelets,
    cubeScrambleHash,
    setIsScrambleValid,
    isConnected
  ])

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

  const handleConnect = useCallback(() => {
    setConnectionFailed(false)
    btCube.current.init(macAddress)
  }, [macAddress])

  const isRegisterMode = publicRegisterKey !== undefined
  const isAuthMode = publicAuthKey !== undefined

  return (
    <>
      {isRegisterMode && (
        <RegisterPasskeyDialog
          isOpen={showAuthDialog}
          onClose={handleCloseDialog}
          btCube={btCube}
          isConnected={isConnected}
          connectionFailed={connectionFailed}
          facelets={facelets}
          isScrambleValid={isScrambleValid}
          validCubeNum={validCubeNum}
          macAddress={macAddress}
          onConnect={handleConnect}
          publicRegisterKey={publicRegisterKey}
          cubeScrambleHash={cubeScrambleHash}
          checkCubeScrambleAgainstHash={checkCubeScrambleAgainstHash}
        />
      )}

      {isAuthMode && (
        <AuthPasskeyDialog
          isOpen={showAuthDialog}
          onClose={handleCloseDialog}
          btCube={btCube}
          isConnected={isConnected}
          connectionFailed={connectionFailed}
          facelets={facelets}
          isScrambleValid={isScrambleValid}
          validCubeNum={validCubeNum}
          macAddress={macAddress}
          onConnect={handleConnect}
          publicAuthKey={publicAuthKey}
          relevantCredentials={relevantCredentials}
        />
      )}
    </>
  )
}

export default PasskeyDialog
