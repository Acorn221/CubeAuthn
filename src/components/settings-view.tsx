import type { CubeHashConfig, StoredWebAuthnCredential } from "@/background/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { MacAddressForm } from "@/components/mac-address-form"
import { AlertTriangle } from "lucide-react"
import * as React from "react"
import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  // Settings state
  const [useSameCubeScramble, setUseSameCubeScramble] = useStorage(
    "useSameCubeScramble",
    (v: boolean | undefined) => (v === undefined ? true : v)
  )

  const [useStoredSecretEntropy, setUseStoredSecretEntropy] = useStorage(
    "useStoredSecretEntropy",
    (v: boolean | undefined) => (v === undefined ? true : v)
  )

  const [cubeScrambleHash] = useStorage<CubeHashConfig>(
    "fixedCubeScrambleHash"
  )

  const [storageArea, setStorageArea] = useStorage(
    "storageArea",
    (v: "local" | "sync" | undefined) => (v === undefined ? "sync" : v)
  )

  // Get credentials using the storage hook
  const [credentials] = useStorage<StoredWebAuthnCredential[]>(
    "webauthn_credentials",
    (v) => v || []
  )

  // Set passkeysExist based on credentials
  const [passkeysExist, setPasskeysExist] = useState(false)
  useEffect(() => {
    setPasskeysExist(credentials.length > 0)
  }, [credentials])

  return (
    <div>
      <Card className="w-[350px] border-border shadow-lg">
        <CardHeader className="pb-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 h-8 w-8 p-0"
            onClick={onBack}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <CardTitle className="text-xl">Settings</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Warning message if passkeys exist */}
          {passkeysExist && (
            <div className="bg-amber-900/30 border border-amber-500/50 rounded-md p-3 mb-4 flex items-start gap-4">
              <AlertTriangle className="text-amber-500 size-4 mt-0.5 flex-shrink-0" />
              <div className="text-md text-amber-200">
                <p className="mb-1 font-bold">
                  Security Settings Locked
                </p>
                <p className="text-sm">
                  You cannot change security settings after passkeys have been generated.
                  Delete all passkeys first if you need to change these settings.
                </p>
              </div>
            </div>
          )}
          {/* Same Cube Scramble Setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="same-scramble" className="font-medium">
                Use same cube scramble
              </Label>
              <Toggle
                id="same-scramble"
                pressed={useSameCubeScramble}
                onPressedChange={(pressed) => !passkeysExist && setUseSameCubeScramble(pressed)}
                aria-label="Toggle same cube scramble"
                disabled={passkeysExist}
                className={passkeysExist ? "opacity-60" : ""}
                variant="outline">
                {useSameCubeScramble ? "On" : "Off"}
              </Toggle>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the same cube scramble will be used for all
              passkeys. This means you'll solve the same pattern every time.
            </p>
            {useSameCubeScramble && (
              <>
                {!cubeScrambleHash ? (
                  <div className="bg-amber-900/30 border border-amber-500/50 rounded-md p-3 mb-4 flex items-start gap-4">
                    <AlertTriangle className="text-amber-500 size-4 mt-0.5 flex-shrink-0 " />
                    <div className="text-md text-amber-200 flex flex-col gap-2">
                      <p className="font-medium mb-1 font-bold">
                        Warning: No Saved Cube Scramble
                      </p>
                      <p>
                        You need to set a cube scramble before you can use the
                        same cube scramble feature.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.open("/tabs/set-scramble.html", "_blank")
                        }}>
                        Set cube scramble
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      window.open("/tabs/set-scramble.html", "_blank")
                    }}>
                    Change Cube Scramble
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Use Stored Secret Entropy Setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-secret" className="font-medium">
                Use stored secret entropy
              </Label>
              <Toggle
                id="use-secret"
                pressed={useStoredSecretEntropy}
                onPressedChange={(pressed) => !passkeysExist && setUseStoredSecretEntropy(pressed)}
                aria-label="Toggle use stored secret entropy"
                disabled={passkeysExist}
                className={passkeysExist ? "opacity-60" : ""}
                variant="outline">
                {useStoredSecretEntropy ? "On" : "Off"}
              </Toggle>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the cube state is combined with a stored secret for
              additional security. When disabled, only the raw cube state is
              used.
            </p>
          </div>
          {/* Storage Area Setting, only applies to secret key */}

          {useStoredSecretEntropy && (
            <div className="space-y-2">
              <Label className="font-medium">Storage Area</Label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`flex items-center justify-center rounded-md border p-2 ${passkeysExist ? 'opacity-60' : 'cursor-pointer'} ${storageArea === "sync" ? "border-primary bg-primary/10" : "border-input"}`}
                  onClick={() => !passkeysExist && setStorageArea("sync")}>
                  <div className="text-center">
                    <div className="font-medium">Sync</div>
                    <div className="text-xs text-muted-foreground">
                      Across devices
                    </div>
                  </div>
                </div>
                <div
                  className={`flex items-center justify-center rounded-md border p-2 ${passkeysExist ? 'opacity-60' : 'cursor-pointer'} ${storageArea === "local" ? "border-primary bg-primary/10" : "border-input"}`}
                  onClick={() => !passkeysExist && setStorageArea("local")}>
                  <div className="text-center">
                    <div className="font-medium">Local</div>
                    <div className="text-xs text-muted-foreground">
                      This device only
                    </div>
                  </div>
                </div>
              </div>
              {!passkeysExist && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Sync:</strong> Your secret will be synced across all your
                    devices where you're signed in with the same browser account.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Local:</strong> Your secret will be stored only on this device
                    and won't be available on other devices.
                  </p>
                </>
              )}
              
            </div>
          )}
        </div>
      </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground w-full text-center">
            Settings are saved automatically
          </p>
        </CardFooter>
      </Card>
      
      <div className="mt-4">
        <MacAddressForm
          saveButtonText="Update MAC Address"
        />
      </div>
    </div>
  )
}
