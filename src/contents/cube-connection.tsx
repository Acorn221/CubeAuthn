import type { PlasmoCSConfig } from "plasmo"
import { BTCube } from "gan-i3-356-bluetooth"
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { useEffect, useRef, useState } from "react"
import {
  PortClientProvider,
  useMessageHandler,
} from "../contents-helpers/port-messaging/hooks"
import { useStorage } from "@plasmohq/storage/hook"

export const config: PlasmoCSConfig = {
  matches: ["https://webauthn.io/*"],
  run_at: "document_start",
}

// Main component wrapper with PortClientProvider
const CubeConnectionWrapper = () => {
  return (
    <PortClientProvider portName="cube-connection">
      <CubeConnection />
    </PortClientProvider>
  )
}

const CubeConnection = () => {
  const btCube = useRef(new BTCube());
  const [facelets, setFacelets] = useState('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [macAddress, setMacAddress] = useStorage<string>("macAddress", (x) => x || "")
  
  // Handler for authentication requests
  useMessageHandler('connectCube', async  () => {
    // Check if this is an authentication notification
    let result: boolean | undefined;
    setShowAuthDialog(true);
    try {
      await btCube.current.init(macAddress)
      result = btCube.current.isConnected();
    } catch (e) {
      console.error("Failed to initialize Bluetooth Cube:", e);
    }

    setShowAuthDialog(false);
    return { result };
  }, [macAddress]);



  useEffect(() => {
    const listener = (data) => {
      setFacelets(data.facelet as string);
    }
    
    btCube.current.on("cubeStateChanged", listener);
    
    return () => {
      btCube.current.stop();
      btCube.current.off("cubeStateChanged", listener);
    }
  }, [btCube.current]);

  // Handle authentication confirmation
  const handleAuthConfirm = async () => {
    try {
      // Use the window.cubeAuth API to authenticate
      // TODO: send back to the background script 
    } catch (error) {
      console.error("Authentication error:", error);
    } finally {
      // Close the dialog regardless of result
      setShowAuthDialog(false);
    }
  };

  return (
    <>
      {/* Authentication Dialog */}
      {showAuthDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <Card className="w-96 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
            <p className="mb-6">The website is requesting authentication using your Rubik's Cube. Please solve the cube pattern to authenticate.</p>
            Cube {btCube.current.isConnected() ? "Connected" : "Disconnected"}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancel</Button>
              <Button onClick={handleAuthConfirm}>Authenticate</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
 
export default CubeConnectionWrapper

