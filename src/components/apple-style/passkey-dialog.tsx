import React, { useCallback, useEffect, useRef, useState } from "react";
import RubiksCubeIcon from "./rubiks-cube-icon";
import { BTCube } from "gan-i3-356-bluetooth";
import { useSendMessage, useMessageHandler } from "@/contents-helpers/port-messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { UserLock } from "lucide-react";
import { cubeSVG } from "sr-visualizer";
import "./apple-style.css";

const PasskeyDialog: React.FC = () => {
  const btCube = useRef(new BTCube());
  const [isConnected, setIsConnected] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [facelets, setFacelets] = useState(
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
  );
  const [macAddress, setMacAddress] = useStorage<string>(
    "macAddress",
    (x) => x || ""
  );

  const frontCubeRef = useRef<HTMLDivElement>();
  const backCubeRef = useRef<HTMLDivElement>();

  const sendResult = useSendMessage("auth");

  useEffect(() => {
    setIsConnected(btCube.current.isConnected());
  }, [btCube.current.isConnected()]);

  // Handler for authentication requests
  useMessageHandler(
    "openAuthDialog",
    async () => {
      let result: boolean | undefined;
      setShowAuthDialog(true);
      try {
        await btCube.current.init(macAddress);
        result = btCube.current.isConnected();
      } catch (e) {
        console.error("Failed to initialize Bluetooth Cube:", e);
      }

      return { result };
    },
    [macAddress]
  );

  const convertCubeFormat = useCallback((cubeString: string): string => {
    const colorMap: Record<string, string> = {
      U: "w", // Up face = white
      R: "r", // Right face = red
      F: "b", // Front face = blue
      D: "y", // Down face = yellow
      L: "o", // Left face = orange
      B: "g" // Back face = green
    };

    return cubeString
      .split("")
      .map((face) => colorMap[face] || face)
      .join("");
  }, []);

  useEffect(() => {
    if (frontCubeRef.current) {
      frontCubeRef.current.innerHTML = "";
      cubeSVG(
        frontCubeRef.current,
        `r=x-270y-225x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      );
    }
  }, [frontCubeRef.current, facelets, convertCubeFormat]);

  useEffect(() => {
    if (backCubeRef.current) {
      backCubeRef.current.innerHTML = "";
      cubeSVG(
        backCubeRef.current,
        `r=x-90y-135x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      );
    }
  }, [backCubeRef.current, facelets, convertCubeFormat]);

  useEffect(() => {
    const listener = (data) => {
      setIsConnected(true);
      setFacelets(data.facelet as string);
    };

    btCube.current.on("cubeStateChanged", listener);

    return () => {
      btCube.current.stop();
      btCube.current.off("cubeStateChanged", listener);
    };
  }, [btCube.current]);

  // Handle authentication confirmation
  const handleAuthConfirm = async () => {
    try {
      const cubeNum = btCube.current.getCube().getStateHex();
      btCube.current.stop();

      const res = await sendResult({
        cubeNum
      });

      if (res.success) {
        // Success animation could be added here
      }
    } catch (error) {
      console.error("Authentication error:", error);
    } finally {
      setShowAuthDialog(false);
      setIsConnected(false);
    }
  };

  return (
    <>
      {showAuthDialog && (
        <div
          className="fixed inset-0 apple-dialog-backdrop flex items-center justify-center z-[9999] apple-dialog"
          onClick={() => setShowAuthDialog(false)}
        >
          <div
            className="w-[360px] apple-dialog-container text-white rounded-lg shadow-xl overflow-hidden flex flex-col gap-2 p-4"
            onClick={(e) => e.stopPropagation()} // Prevent clicks on the dialog from closing it
          >
            {/* Header with Sign In text and Cancel button */}
            <div className="flex mx-4 cursor-default">
              <div className="flex-1 top-4 flex items-center">
                <UserLock className="size-6" />
                <span className="text-md font-medium ml-2">Sign In</span>
              </div>
              <div className="">
                <button
                  onClick={() => setShowAuthDialog(false)}
                  className="px-3 py-1 rounded-md bg-[#3a3a3c] text-white text-sm font-normal cursor-pointer"
                >
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
              
              <h2 className="text-lg apple-dialog-title mb-1">Use your Cube to sign in?</h2>
              
              <p className="apple-dialog-description text-center text-xs mb-2">
                A passkey will be created on this extension and synced with your google account.
              </p>
              
              {isConnected && (
                <div className="w-full flex cube-container mb-2">
                  <div ref={frontCubeRef as any} className="flex-1" />
                  <div ref={backCubeRef as any} className="flex-1" />
                </div>
              )}
              
              {!isConnected && (
                <div className="text-center mb-4 text-xs text-[#8e8e93]">
                  Connecting to the Cube...
                </div>
              )}
              
              {isConnected ? (
                <button
                  onClick={handleAuthConfirm}
                  className="w-full py-3 rounded-md bg-[#0071e3] text-white font-medium text-sm"
                >
                  Confirm Scramble
                </button>
              ) : (
                <button
                  onClick={() => btCube.current.init(macAddress)}
                  className="w-full py-3 rounded-md bg-[#3a3a3c] text-white font-medium text-sm"
                >
                  Connect to Cube
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PasskeyDialog;