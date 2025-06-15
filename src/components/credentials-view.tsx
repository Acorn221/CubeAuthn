import * as React from "react"
import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StoredWebAuthnCredential } from "@/background/types"
import { getConfiguredStorage } from "@/background/utils"

interface CredentialsViewProps {
  onBack: () => void
}

export function CredentialsView({ onBack }: CredentialsViewProps) {
  const [credentials, setCredentials] = useState<StoredWebAuthnCredential[]>([])
  const [filteredCredentials, setFilteredCredentials] = useState<StoredWebAuthnCredential[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCredentials = async () => {
      setLoading(true)
      try {
        const storage = await getConfiguredStorage()
        const storedCredentials = await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials") || []
        setCredentials(storedCredentials)
        setFilteredCredentials(storedCredentials)
      } catch (error) {
        console.error("Error fetching credentials:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredentials()
  }, [])

  // Filter credentials when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCredentials(credentials)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = credentials.filter(credential => {
      const hostname = new URL(credential.siteUrl).hostname.toLowerCase()
      const username = (credential.user.name || credential.user.displayName || "").toLowerCase()
      
      return hostname.includes(term) || username.includes(term)
    })
    
    setFilteredCredentials(filtered)
  }, [searchTerm, credentials])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleDeleteCredential = async (id: string) => {
    try {
      const storage = await getConfiguredStorage()
      const storedCredentials = await storage.get<StoredWebAuthnCredential[]>("webauthn_credentials") || []
      
      // Remove the credential
      const updatedCredentials = storedCredentials.filter(cred => cred.id !== id)
      
      // Update storage
      await storage.set("webauthn_credentials", updatedCredentials)
      
      // Update state
      setCredentials(updatedCredentials)
    } catch (error) {
      console.error("Error deleting credential:", error)
    }
  }

  return (
    <Card className="w-[350px] border-border shadow-lg">
      <CardHeader className="space-y-1 relative">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Stored Passkeys</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={onBack}
          >
            Back
          </Button>
        </div>
        <CardDescription className="text-muted-foreground">
          WebAuthn credentials saved for websites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              title="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </Button>
          )}
        </div>
        
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading credentials...</p>
        ) : filteredCredentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "No matching passkeys found." : "No passkeys stored yet."}
          </p>
        ) : (
          <ScrollArea className="h-[240px] rounded-md">
            <div className="space-y-2 pr-3">
              {filteredCredentials.map((credential) => (
                <div key={credential.id} className="p-3 bg-muted rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{new URL(credential.siteUrl).hostname}</p>
                      <p className="text-xs text-muted-foreground mt-1">Created: {formatDate(credential.createdAt)}</p>
                      <p className="text-xs text-muted-foreground mt-1">User: {credential.user.name || credential.user.displayName}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-red-500"
                      // className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCredential(credential.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}