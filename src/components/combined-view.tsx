import type { StoredWebAuthnCredential } from "@/background/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2 } from "lucide-react"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

interface CombinedViewProps {
  onViewSettings: () => void
}

export function CombinedView({ onViewSettings }: CombinedViewProps) {
  const [credentials, setCredentials] = useStorage<StoredWebAuthnCredential[]>(
    "webauthn_credentials",
    (v) => v || []
  )
  const [searchTerm, setSearchTerm] = useState("")


  const filteredCredentials = useMemo(() => {
    console.log("creds", credentials)
    const term = searchTerm.toLowerCase()
    return credentials.filter((credential) => {
      const hostname = new URL(credential.siteUrl).hostname.toLowerCase()
      const username = (
        credential.user.name ||
        credential.user.displayName ||
        ""
      ).toLowerCase()

      return hostname.includes(term) || username.includes(term)
    })
  }, [credentials, searchTerm])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleDeleteCredential = async (id: string) => {
    setCredentials((prev) => prev.filter((cred) => cred.id !== id))
  }

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
            title="Settings">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </Button>
        </div>
        <CardDescription className="text-muted-foreground">
          Revolutionising the way you procrastinate at work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No passkeys stored yet.
            </p>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                When prompted by a website for WebAuthn authentication, solve
                your cube to complete the authentication. Your passkeys will
                appear here after registration.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Search passkeys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSearchTerm("")}
                  title="Clear search">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </Button>
              )}
            </div>

            {filteredCredentials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching passkeys found.
              </p>
            ) : (
              <ScrollArea className="h-[240px] rounded-md">
                <div className="space-y-2 pr-3">
                  {filteredCredentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {new URL(credential.siteUrl).hostname}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {formatDate(credential.createdAt)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            User:{" "}
                            {credential.user.name ||
                              credential.user.displayName}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDeleteCredential(credential.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
