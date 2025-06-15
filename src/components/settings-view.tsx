import * as React from "react"
import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  // Settings state
  const [useSameCubeScramble, setUseSameCubeScramble] = useStorage(
    'useSameCubeScramble', 
    (v: boolean | undefined) => v === undefined ? false : v
  )
  
  const [secretStorageArea, setSecretStorageArea] = useStorage(
    'secretStorageArea',
    (v: "local" | "sync" | undefined) => v === undefined ? "sync" : v
  )

  // Handle toggle for using same cube scramble
  const handleToggleSameCubeScramble = () => {
    setUseSameCubeScramble(!useSameCubeScramble)
  }

  return (
    <Card className="w-[300px] border-border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Settings</CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure your Rubik's Cube WebAuthn extension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Same Cube Scramble Setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="same-scramble" className="font-medium">Use same cube scramble</Label>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 
                bg-input data-[state=checked]:bg-primary"
                data-state={useSameCubeScramble ? "checked" : "unchecked"}
                onClick={handleToggleSameCubeScramble}
                id="same-scramble"
                role="switch"
                aria-checked={useSameCubeScramble}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${useSameCubeScramble ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the same cube scramble will be used for all passkeys. This means you'll solve the same pattern every time.
            </p>
          </div>

          {/* Storage Area Setting */}
          <div className="space-y-2">
            <Label className="font-medium">Storage Area</Label>
            <div className="grid grid-cols-2 gap-2">
              <div 
                className={`flex items-center justify-center rounded-md border p-2 cursor-pointer ${secretStorageArea === 'sync' ? 'border-primary bg-primary/10' : 'border-input'}`}
                onClick={() => setSecretStorageArea('sync')}
              >
                <div className="text-center">
                  <div className="font-medium">Sync</div>
                  <div className="text-xs text-muted-foreground">Across devices</div>
                </div>
              </div>
              <div 
                className={`flex items-center justify-center rounded-md border p-2 cursor-pointer ${secretStorageArea === 'local' ? 'border-primary bg-primary/10' : 'border-input'}`}
                onClick={() => setSecretStorageArea('local')}
              >
                <div className="text-center">
                  <div className="font-medium">Local</div>
                  <div className="text-xs text-muted-foreground">This device only</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Sync:</strong> Your secret entropy key is synced across all devices using this extension. This secret key is required alongside the cube scramble to generate passkeys.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Local:</strong> Your secret entropy key is only stored on this device. This means passkeys will only work here with the correct cube scramble.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Note:</strong> Changing this setting will not migrate existing passkeys. New passkeys will be stored in the selected area.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
      </CardFooter>
    </Card>
  )
}