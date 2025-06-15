import "@/popup/styles.css"
import { useStorage } from "@plasmohq/storage/hook"
import { MainView } from "@/components/main-view"
import { CredentialsView } from "@/components/credentials-view"
import { SettingsView } from "@/components/settings-view"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const Popup = () => {
  const [macAddress] = useStorage('macAddress', (x: string | undefined) =>
    x === undefined ? "" : x,
  );
  const [currentView, setCurrentView] = useState<'main' | 'showcase' | 'credentials' | 'settings'>('main')
  const [hasMacAddress, setHasMacAddress] = useState(false)

  // Check if MAC address is set
  useEffect(() => {
    if (macAddress && macAddress.trim() !== "") {
      setHasMacAddress(true)
    } else {
      setHasMacAddress(false)
    }
  }, [macAddress])

  return (
    <div className="p-4 font-sans bg-background text-foreground">
      {currentView === 'showcase' && (
        <>
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => setCurrentView('main')}
          >
            Back
          </Button>
        </>
      )}

      {currentView === 'credentials' && (
        <CredentialsView onBack={() => setCurrentView('main')} />
      )}

      {currentView === 'settings' && (
        <SettingsView onBack={() => setCurrentView('main')} />
      )}

      {currentView === 'main' && (
        <MainView
          onViewShowcase={() => setCurrentView('showcase')}
          onViewCredentials={() => setCurrentView('credentials')}
          onViewSettings={() => setCurrentView('settings')}
        />
      )}
    </div>
  )
}

export default Popup
