import React, { useCallback } from "react"
import { useSendMessage } from "@/contents-helpers/port-messaging"
import { BTCube } from "gan-i3-356-bluetooth"

import BasePasskeyDialog from "./base-passkey-dialog"
import type { CubeHashConfig } from "@/background/types"

interface RegisterPasskeyDialogProps {
  isOpen: boolean
  onClose: () => void
  btCube: React.MutableRefObject<BTCube>
  isConnected: boolean
  connectionFailed: boolean
  facelets: string
  isScrambleValid: boolean
  validCubeNum: string | null
  macAddress: string
  onConnect: () => void
  publicRegisterKey?: CredentialCreationOptions["publicKey"]
  cubeScrambleHash?: CubeHashConfig
  checkCubeScrambleAgainstHash: () => Promise<boolean>
}

const RegisterPasskeyDialog: React.FC<RegisterPasskeyDialogProps> = ({
  isOpen,
  onClose,
  btCube,
  isConnected,
  connectionFailed,
  facelets,
  isScrambleValid,
  validCubeNum,
  macAddress,
  onConnect,
  publicRegisterKey,
  cubeScrambleHash,
  checkCubeScrambleAgainstHash
}) => {
  const sendRegister = useSendMessage("register")

  const handleRegisterConfirm = async () => {
    try {
      if (!validCubeNum) {
        throw new Error("Cube scramble does not match the expected hash.")
      }
      
      btCube.current.stop()

      const res = await sendRegister({
        cubeNum: validCubeNum,
        // getting the origin from the isolated cs for security
        origin: window.location.origin
      })

      if (res.success) {
        // Success animation could be added here
        onClose()
      }
    } catch (error) {
      console.error("Registration error:", error)
    }
  }

  const description = publicRegisterKey 
    ? `A passkey will be created for "${publicRegisterKey.user.displayName}" on this extension and synced with your google account.`
    : undefined

  return (
    <BasePasskeyDialog
      isOpen={isOpen}
      onClose={onClose}
      btCube={btCube}
      isConnected={isConnected}
      connectionFailed={connectionFailed}
      facelets={facelets}
      isScrambleValid={isScrambleValid}
      validCubeNum={validCubeNum}
      macAddress={macAddress}
      onConnect={onConnect}
      title="Use CubeAuthn to sign in?"
      description={description}>
      
      {isConnected && publicRegisterKey && (
        <button
          onClick={handleRegisterConfirm}
          disabled={!validCubeNum}
          className={`w-full py-3 rounded-md ${validCubeNum ? "bg-[#0071e3]" : "bg-[#0071e3]/50 cursor-not-allowed"} text-white font-medium text-sm`}>
          {cubeScrambleHash ? "Confirm" : "Confirm Scramble"}
        </button>
      )}
    </BasePasskeyDialog>
  )
}

export default RegisterPasskeyDialog