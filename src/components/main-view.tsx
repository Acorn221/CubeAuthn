import * as React from "react"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface MainViewProps {
  onViewShowcase: () => void
  onViewCredentials: () => void
  onViewSettings: () => void
}

export function MainView({ onViewShowcase, onViewCredentials, onViewSettings }: MainViewProps) {
  const [macAddress] = useStorage('macAddress', (x: string | undefined) =>
    x === undefined ? "" : x,
  );

  // No need to format the MAC address, display it in full
  const formatMacAddress = (mac: string) => {
    return mac || "";
  };

  return (
    <Card className="w-[350px] border-border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">CubeAuthn</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your cube is configured for WebAuthn authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Cube MAC Address:</span>
            </p>
            <p className="text-sm font-mono mt-1">{formatMacAddress(macAddress)}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              When prompted by a website for WebAuthn authentication, solve your cube to complete the authentication.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={onViewCredentials}
        >
          View Stored Passkeys
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onViewSettings}
        >
          Settings
        </Button>
      </CardFooter>
    </Card>
  )
}