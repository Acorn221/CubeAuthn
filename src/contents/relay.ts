import { relayMessage } from "@plasmohq/messaging";
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: 'document_start',
  all_frames: true,
};

// Relay messages for WebAuthn handling
relayMessage({
  name: 'handleRegister',
});

relayMessage({
  name: 'handleAuthentication',
});
