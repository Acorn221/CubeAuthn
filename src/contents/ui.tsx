import type { PublicKeyCredentialRequestOptionsSerialized } from "@/background/types"
import {
  initPortClient,
  useMessageHandler
} from "@/contents-helpers/port-messaging"
import appleStyleCss from "data-text:@/components/apple-style/apple-style.css"
import cssText from "data-text:~/contents/style.css"
import { UserLock } from "lucide-react"
import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
}
const styleElement = document.createElement("style")

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  // Process main CSS
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })

  // Add Apple style CSS
  updatedCssText += "\n" + appleStyleCss

  styleElement.textContent = updatedCssText

  return styleElement
}

const AuthIframe = () => {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [publicRegisterKey, setRegisterPublicKey] = useState<
    CredentialCreationOptions["publicKey"] | undefined
  >()
  const [publicAuthKey, setAuthPublicKey] = useState<
    PublicKeyCredentialRequestOptionsSerialized | undefined
  >()

  useEffect(() => {
    initPortClient({ timeout: 1000 * 60 * 15 }).catch((error) => {
      console.error("Failed to initialize port client in UI component:", error)
    })
  }, [])

  useMessageHandler(
    "registerDialog",
    async (req) => {
      let result: boolean | undefined
      setShowAuthDialog(true)
      setRegisterPublicKey(req.publicKey)

      return { result: true }
    },
    []
  )

  if (showAuthDialog) {
    return (
      <div
        className="fixed inset-0 apple-dialog-backdrop flex items-center justify-center z-[9999] apple-dialog"
        onClick={() => setShowAuthDialog(false)}>
        <div
          className="w-[360px] apple-dialog-container text-white rounded-lg shadow-xl overflow-hidden flex flex-col gap-2 p-5"
          onClick={(e) => e.stopPropagation()} // Prevent clicks on the dialog from closing it
        >
          <div className="flex cursor-default">
            <div className="flex-1 flex items-center">
              <UserLock className="size-6" />
              <span className="text-md font-medium ml-2">Sign In</span>
            </div>
            <div>
              <button
                onClick={() => setShowAuthDialog(false)}
                className="px-4 py-1.5 rounded-md bg-[#3a3a3c] text-white text-sm font-normal cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
          <iframe
            src={chrome.runtime.getURL("tabs/auth-iframe.html")}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    )
  }
  return null
}

export default AuthIframe
