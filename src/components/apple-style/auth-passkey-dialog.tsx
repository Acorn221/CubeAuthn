import type {
  PublicKeyCredentialRequestOptionsSerialized,
  StoredWebAuthnCredential
} from "@/background/types"
import { useSendMessage } from "@/contents-helpers/port-messaging"
import { BTCube } from "gan-i3-356-bluetooth"
import React, { useCallback } from "react"

import BasePasskeyDialog from "./base-passkey-dialog"

interface AuthPasskeyDialogProps {
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
  publicAuthKey?: PublicKeyCredentialRequestOptionsSerialized
  relevantCredentials: StoredWebAuthnCredential[]
}

const AuthPasskeyDialog: React.FC<AuthPasskeyDialogProps> = ({
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
  publicAuthKey,
  relevantCredentials
}) => {
  const sendAuth = useSendMessage("auth")

  const handleAuthConfirm = useCallback(
    async (keyId: string) => {
      try {
        const res = await sendAuth({
          keyId,
          origin: window.location.origin,
          cubeNum: validCubeNum
        })

        if (res.success) {
          onClose()
        }
      } catch (error) {
        console.error("Authentication error:", error)
      }
    },
    [validCubeNum, sendAuth, onClose]
  )

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
      hideCubeWhenValid={false}>
      {publicAuthKey && validCubeNum && (
        <div className="flex flex-col gap-4 w-full">
          <div className="w-full text-md apple-dialog-description">
            Login With:
          </div>

          <div className="flex flex-col gap-2 w-full">
            {relevantCredentials.map((cred) => (
              <button
                key={cred.id}
                onClick={() => handleAuthConfirm(cred.id)}
                className="w-full py-3 rounded-md bg-[#0071e3] text-white font-medium text-sm">
                {cred.user.displayName}
              </button>
            ))}
          </div>
        </div>
      )}
    </BasePasskeyDialog>
  )
}

export default AuthPasskeyDialog
