import type { PlasmoCSConfig } from "plasmo"
import { BTCube } from "../../cube-dist/"

export const config: PlasmoCSConfig = {
  matches: ["*"],
	run_at: "document_start",
	world: "MAIN",
}

