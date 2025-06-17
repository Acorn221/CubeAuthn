import { UserLock } from "lucide-react"
import React, { useCallback, useEffect, useRef } from "react"
import { cubeSVG } from "sr-visualizer"
import { BTCube } from "gan-i3-356-bluetooth"

import RubiksCubeIcon from "./rubiks-cube-icon"
import "./apple-style.css"

export interface BasePasskeyDialogProps {
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
  children?: React.ReactNode
  title?: string
  description?: string
  hideCubeWhenValid?: boolean
}

export const convertCubeFormat = (cubeString: string): string => {
  const colorMap: Record<string, string> = {
    U: "w",
    R: "r",
    F: "g",
    D: "y",
    L: "o",
    B: "b"
  }

  return cubeString
    .split("")
    .map((face) => colorMap[face] || face)
    .join("")
}

const BasePasskeyDialog: React.FC<BasePasskeyDialogProps> = ({
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
  children,
  title = "Use CubeAuthn to sign in?",
  description,
  hideCubeWhenValid = false
}) => {
  const frontCubeRef = useRef<HTMLDivElement>()
  const backCubeRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (frontCubeRef.current) {
      frontCubeRef.current.innerHTML = ""
      cubeSVG(
        frontCubeRef.current,
        `r=x-270y-225x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [frontCubeRef.current, facelets, isConnected])

  useEffect(() => {
    if (backCubeRef.current) {
      backCubeRef.current.innerHTML = ""
      cubeSVG(
        backCubeRef.current,
        `r=x-90y-135x-20&size=300&fc=${convertCubeFormat(facelets)}` as any
      )
    }
  }, [backCubeRef.current, facelets, isConnected])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 apple-dialog-backdrop flex items-center justify-center z-[9999] apple-dialog"
      onClick={onClose}>
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
              onClick={onClose}
              className="px-3 py-1 rounded-md bg-[#3a3a3c] text-white text-sm font-normal cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
        <div className="w-full h-[1px] bg-[#3a3a3c] mb-2" />
        
        {/* Content */}
        <div className="px-4 flex flex-col items-center cursor-default gap-4">
          <div className="w-14 h-14 apple-dialog-icon-container flex items-center justify-center mb-4">
            <RubiksCubeIcon className="w-14 h-14" />
          </div>

          <h2 className="text-lg apple-dialog-title mb-1">
            {title}
          </h2>

          {description && (
            <p className="apple-dialog-description text-center text-xs mb-2">
              {description}
            </p>
          )}

          {/* Show cube preview when connected */}
          {isConnected && (
            <div
              className={`w-full flex cube-container mb-2 ${hideCubeWhenValid && validCubeNum ? "h-0" : "h-full"} animate-in animate-out`}>
              <div ref={frontCubeRef as any} className="flex-1" />
              <div ref={backCubeRef as any} className="flex-1" />
            </div>
          )}

          {/* Show connecting message only when not connected and not showing the connect button */}
          {!isConnected && !connectionFailed && (
            <div className="text-center my-4 text-xs text-[#8e8e93]">
              Connecting to the Cube...
            </div>
          )}

          {/* Show connect button when connection failed */}
          {connectionFailed && (
            <button
              onClick={onConnect}
              className="w-full py-3 rounded-md bg-[#3a3a3c] text-white font-medium text-sm">
              Connect to Cube
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}

export default BasePasskeyDialog