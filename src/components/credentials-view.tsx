import * as React from "react"
import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { StoredWebAuthnCredential } from "@/background/types"
import { getConfiguredStorage } from "@/background/utils"

interface CredentialsViewProps {
  onBack: () => void
}

export function CredentialsView({ onBack }: CredentialsViewProps) {
  const [credentials, setCredentials] = useState<Record<string, StoredWebAuthnCredential>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCredentials = async () => {
      setLoading(true)
      try {
        const storage = await getConfiguredStorage()
        const storedCredentials = await storage.get<Record<string, StoredWebAuthnCredential>>("webauthn_credentials") || {}
        setCredentials(storedCredentials)
      } catch (error) {
        console.error("Error fetching credentials:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredentials()
  }, [])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleDeleteCredential = async (id: string) => {
    try {
      const storage = await getConfiguredStorage()
      const storedCredentials = await storage.get<Record<string, StoredWebAuthnCredential>>("webauthn_credentials") || {}
      
      // Remove the credential
      delete storedCredentials[id]
      
      // Update storage
      await storage.set("webauthn_credentials", storedCredentials)
      
      // Update state
      setCredentials(storedCredentials)
    } catch (error) {
      console.error("Error deleting credential:", error)
    }
  }

  return (
    <Card className="w-[350px] border-border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Stored Passkeys</CardTitle>
        <CardDescription className="text-muted-foreground">
          WebAuthn credentials saved for websites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading credentials...</p>
          ) : Object.keys(credentials).length === 0 ? (
            <p className="text-sm text-muted-foreground">No credentials stored yet.</p>
          ) : (
            Object.entries(credentials).map(([id, credential]) => (
              <div key={id} className="p-3 bg-muted rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{new URL(credential.siteUrl).hostname}</p>
                    <p className="text-xs text-muted-foreground mt-1">Created: {formatDate(credential.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-1">User: {credential.user.name || credential.user.displayName}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCredential(id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
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