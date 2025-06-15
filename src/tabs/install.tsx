import "./install/styles.css"
import React, { useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Box, ChevronRight, Info, Lightbulb, ShieldCheck } from "lucide-react"

import RubiksCubeIcon from "@/components/apple-style/rubiks-cube-icon"
import { MacAddressForm } from "@/components/mac-address-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Introduction Screen Component
const IntroScreen = ({ onNext }: { onNext: () => void }) => {
  return (
    <>
      <CardHeader>
        <CardTitle>Rubik's Cube WebAuthn</CardTitle>
        <CardDescription>
          Secure authentication with a physical Rubik's Cube
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <RubiksCubeIcon className="w-16 h-16" />
          </div>

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-md p-3 mb-4 flex items-start gap-2 w-full">
            <Info className="text-blue-500 size-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-200">
              <p className="font-medium mb-1">Proof of Concept</p>
              <p>
                This is a proof of concept and not a final secure solution. The security of this method depends on keeping your cube's scramble pattern secret.
              </p>
            </div>
          </div>

          <div className="w-full mb-4">
            <h3 className="text-sm font-medium mb-2">How it works:</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-decimal pl-5">
              <li>Connect your Bluetooth Rubik's Cube</li>
              <li>Set a unique scramble pattern as your secret key</li>
              <li>Use your cube to authenticate on websites that support WebAuthn</li>
            </ul>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button 
          className="w-full" 
          onClick={onNext}
        >
          Get Started
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </CardFooter>
    </>
  )
}

// MAC Address Screen Component
const MacAddressScreen = ({
  onBack,
  onNext,
  macAddress
}: {
  onBack: () => void,
  onNext: () => void,
  macAddress: string
}) => {
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const handleContinue = () => {
    console.log("handleContinue called");
    console.log("saveHandler:", saveHandler);
    
    // First save the MAC address, then navigate to the next step
    if (saveHandler) {
      console.log("Calling saveHandler");
      saveHandler();
    }
    
    // Navigate to the next step regardless
    // This ensures we move forward even if there's an issue with the save handler
    console.log("Calling onNext");
    onNext();
  };

  const handleValidationState = (isValid: boolean, hasInputValue: boolean) => {
    setIsFormValid(isValid);
    setHasValue(hasInputValue);
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Set Up Your Cube</CardTitle>
        <CardDescription>
          We need the MAC address to decrypt messages from your cube
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center">
          <MacAddressForm
            onCancel={onBack}
            hideButtons={true}
            getSaveHandler={setSaveHandler}
            getValidationState={handleValidationState}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button
          className="w-full"
          onClick={handleContinue}
          disabled={!isFormValid || !hasValue}
        >
          Continue to Next Step
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </CardFooter>
    </>
  )
}

// Explanation Screen Component
const ExplanationScreen = ({ onNext }: { onNext: () => void }) => {
  return (
    <>
      <CardHeader>
        <CardTitle>How It Works</CardTitle>
        <CardDescription>
          Understanding the authentication process
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
            <Box className="text-primary size-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium mb-1">Cube Connection</h3>
              <p className="text-xs text-muted-foreground">
                Your Rubik's Cube is now connected to the extension. The next step is to set a unique scramble pattern that will be used as your secret key.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
            <ShieldCheck className="text-primary size-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium mb-1">Security Model</h3>
              <p className="text-xs text-muted-foreground">
                The scramble pattern of your cube acts as a physical secret. When authenticating, the extension reads the current state of your cube and verifies it matches your saved pattern.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
            <Lightbulb className="text-primary size-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium mb-1">Best Practices</h3>
              <p className="text-xs text-muted-foreground">
                Choose a scramble pattern that's easy for you to remember but difficult for others to guess. Keep your cube in a secure location when not in use.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button 
          className="w-full" 
          onClick={onNext}
        >
          Continue to Set Scramble
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </CardFooter>
    </>
  )
}

// Main Component
const InstallPage = () => {
  const [step, setStep] = useState<"intro" | "mac-address" | "explanation">("intro")
  const [macAddress] = useStorage<string>("macAddress", (x) => x || "")

  // Function to navigate to set-scramble page
  const goToSetScramble = () => {
    window.location.href = chrome.runtime.getURL("tabs/set-scramble.html")
  }

  // Step navigation handlers
  const goToIntro = () => setStep("intro")
  const goToMacAddress = () => setStep("mac-address")
  const goToExplanation = () => setStep("explanation")

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <Card className="w-[400px] border-border shadow-lg">
        {step === "intro" && (
          <IntroScreen onNext={goToMacAddress} />
        )}
        
        {step === "mac-address" && (
          <MacAddressScreen 
            onBack={goToIntro} 
            onNext={goToExplanation}
            macAddress={macAddress}
          />
        )}
        
        {step === "explanation" && (
          <ExplanationScreen onNext={goToSetScramble} />
        )}
      </Card>
    </div>
  )
}

export default InstallPage