import {
  initPortClient,
  useMessageHandler,
	useSendMessage
} from "@/contents-helpers/port-messaging"

import "./auth-iframe/styles.css"

import type { PublicKeyCredentialRequestOptionsSerialized } from "@/background/types"
import { BTCube } from "gan-i3-356-bluetooth"
import { UserLock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"

const AuthIframe = () => {
  const [publicRegisterKey, setRegisterPublicKey] = useState<
    CredentialCreationOptions["publicKey"] | undefined
  >()
  const [publicAuthKey, setAuthPublicKey] = useState<
    PublicKeyCredentialRequestOptionsSerialized | undefined
  >()

	const sendReady = useSendMessage("iframeReady")

	const [macAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  )

  useEffect(() => {
    initPortClient({ timeout: 1000 * 60 * 15 }).catch((error) => {
      console.error("Failed to initialize port client in UI component:", error)
    });
		// TODO: GET THE ID FROM THE QUERY PARAMS
		const id = window.location.search;
		sendReady({ id: });
  }, [])

  useMessageHandler(
    "registerDialog",
    async () => {
      return { origin: window.location.origin }
    },
    []
  )

  useEffect(() => {
    const shizz = async () => {
      const btCube = new BTCube()

      await btCube.init(macAddress)
    }
    void shizz()
  }, [])

  // TODO: SETUP A LISTENER FOR A MESSAGE FROM THE BG TO TELL US WHAT WE NEED TO DO

  return <div>HI</div>
}

export default AuthIframe
