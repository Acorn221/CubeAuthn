import { Storage } from "@plasmohq/storage"

import { PortManager } from "./port-messaging-api"
import type { InboundMessages, OutboundMessages } from "./types"

// @ts-expect-error Create manager with separate inbound/outbound types (complains about types - is fine)
export const ports = new PortManager<InboundMessages, OutboundMessages>({
  timeout: 1000 * 60 * 15 // 15 mins as it could take the user a while to do the cube
})

chrome.runtime.onInstalled.addListener(async () => {
  const storage = new Storage({ area: "sync" })

  await Promise.all([
    storage.set("useSameCubeScramble", true),
    storage.set("useStoredSecretEntropy", true)
  ])

  await chrome.tabs.create({
    url: "/tabs/install.html"
  })
})
