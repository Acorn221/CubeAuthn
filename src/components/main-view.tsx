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
      <CardHeader className="space-y-1 relative">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">CubeAuthn</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onViewSettings}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </Button>
        </div>
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
      </CardFooter>
    </Card>
  )
}