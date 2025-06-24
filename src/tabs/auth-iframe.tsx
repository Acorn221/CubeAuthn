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
		// Get the ID from the query params
		const urlParams = new URLSearchParams(window.location.search);
		const id = urlParams.get('id');
    if (!id) {
      console.error("No ID provided in the URL query parameters.");
      return;
    }
		sendReady({ id });
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
  }, []);

  const connect = useCallback(async () => {
    const btCube = new BTCube()
    try {
      await btCube.init(macAddress)
    } catch (error) {
      console.error("Failed to connect to the Bluetooth cube:", error);
      return false;
    }
    return true;
  }, [macAddress]);

  // TODO: SETUP A LISTENER FOR A MESSAGE FROM THE BG TO TELL US WHAT WE NEED TO DO

  return <div onClick={connect}>HI</div>
}

export default AuthIframe
