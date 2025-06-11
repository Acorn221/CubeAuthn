import type { PlasmoCSConfig } from "plasmo"
import { BTCube } from "gan-i3-356-bluetooth"
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { getPort } from "@plasmohq/messaging/port"
import { Button } from "~/components/ui/button"
// import { usePort } from "@plasmohq/messaging/hook"
import { useEffect, useRef } from "react"


export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start",
}

const CustomButton = () => {
  const port = useRef(chrome.runtime.connect())

  useEffect(() => {
    const listener = (msg) => {
    }
    port.current.onMessage.addListener(listener);

    port.current.onDisconnect.addListener(() => {
      console.log("Port disconnected")
      port.current.onMessage.removeListener(listener)
    });

    return () => {
      port.current.onMessage.removeListener(listener);
      port.current.disconnect();
      console.log("Port disconnected on cleanup")
    }
  }, [port]);
  return <Button className="fixed b-0 l-0">Custom button</Button>
}
 
export default CustomButton

