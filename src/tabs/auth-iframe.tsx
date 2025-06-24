import { useMessageHandler } from "@/contents-helpers/port-messaging"

import "./auth-iframe/styles.css"

import type { PublicKeyCredentialRequestOptionsSerialized } from "@/background/types"
import { UserLock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

const AuthIframe = () => {
  const [publicRegisterKey, setRegisterPublicKey] = useState<
    CredentialCreationOptions["publicKey"] | undefined
  >()
  const [publicAuthKey, setAuthPublicKey] = useState<
    PublicKeyCredentialRequestOptionsSerialized | undefined
  >()



	return (
		<div>HI</div>
	)
}

export default AuthIframe
