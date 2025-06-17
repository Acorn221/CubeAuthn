import { useEffect } from "react";
import { initPortClient } from "@/contents-helpers/port-messaging";
import cssText from "data-text:~/contents/style.css"
import appleStyleCss from "data-text:@/components/apple-style/apple-style.css"
import type { PlasmoCSConfig } from "plasmo";
import { PasskeyDialog } from "@/components/apple-style";

export const config: PlasmoCSConfig = {
  matches: ["*"],
  run_at: "document_start",
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

const Root = () => {
  // Initialize the port client when the component mounts
  useEffect(() => {
    initPortClient({ timeout: 1000 * 60 * 15 }).catch(error => {
      console.error("Failed to initialize port client in UI component:", error);
    });
  }, []);

  return <PasskeyDialog />;
};

export default Root;
