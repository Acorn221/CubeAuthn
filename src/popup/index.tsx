import "./styles.css"
import { useStorage } from "@plasmohq/storage/hook"
import { MacAddressForm } from "../../components/mac-address-form"
import { MainView } from "../../components/main-view"
import { ShadcnShowcase } from "../../components/shadcn-showcase"
import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"

const Popup = () => {
  const [macAddress] = useStorage('macAddress', (x: string | undefined) =>
    x === undefined ? "" : x,
  );
  const [currentView, setCurrentView] = useState<'main' | 'setup' | 'showcase'>('main')
  const [hasMacAddress, setHasMacAddress] = useState(false)

  // Check if MAC address is set
  useEffect(() => {
    if (macAddress && macAddress.trim() !== "") {
      setHasMacAddress(true)
      setCurrentView('main')
    } else {
      setHasMacAddress(false)
      setCurrentView('setup')
    }
  }, [macAddress])

  return (
    <div className="p-4 font-sans bg-background text-foreground min-h-[400px]">
      {currentView === 'showcase' && (
        <>
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => setCurrentView(hasMacAddress ? 'main' : 'setup')}
          >
            Back
          </Button>
          <div className="overflow-y-auto max-h-[500px] pr-2">
            <ShadcnShowcase />
          </div>
        </>
      )}

      {currentView === 'setup' && (
        <>
          <MacAddressForm onCancel={hasMacAddress ? () => setCurrentView('main') : undefined} />
        </>
      )}

      {currentView === 'main' && (
        <MainView
          onEditMacAddress={() => setCurrentView('setup')}
          onViewShowcase={() => setCurrentView('showcase')}
        />
      )}
    </div>
  )
}

export default Popup
