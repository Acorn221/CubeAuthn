import * as React from "react"
import { useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MacAddressFormProps {
  onCancel?: () => void;
  onSave?: () => void;
  saveButtonText?: string;
  hideButtons?: boolean;
  getSaveHandler?: (saveHandler: () => void) => void;
  getValidationState?: (isValid: boolean, hasValue: boolean) => void;
}

export function MacAddressForm({
  onCancel,
  onSave,
  saveButtonText,
  hideButtons = false,
  getSaveHandler,
  getValidationState
}: MacAddressFormProps) {
  const [macAddress, setMacAddress] = useStorage('macAddress', (x: string | undefined) =>
    x === undefined ? "" : x,
  );
  const [inputValue, setInputValue] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const isEditing = macAddress !== "";

  // MAC address regex pattern (accepts formats like XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
  const macAddressPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

  React.useEffect(() => {
    // Initialize input value with stored MAC address
    setInputValue(macAddress);
    // Validate the initial value
    setIsValid(macAddress === "" || macAddressPattern.test(macAddress));
  }, [macAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsValid(value === "" || macAddressPattern.test(value));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (isValid && inputValue !== "") {
      setMacAddress(inputValue);
      setIsSaved(true);
      
      // Call the onSave callback if provided
      if (onSave) {
        onSave();
      } else {
        // Only auto-hide the success message if we're not navigating away
        setTimeout(() => setIsSaved(false), 3000);
      }
    }
  };

  // Expose the save handler to the parent component
  React.useEffect(() => {
    if (getSaveHandler) {
      getSaveHandler(handleSave);
    }
  }, [getSaveHandler, handleSave]);

  // Expose the validation state to the parent component
  React.useEffect(() => {
    if (getValidationState) {
      getValidationState(isValid, inputValue !== "");
    }
  }, [getValidationState, isValid, inputValue]);

  return (
    <Card className="w-[350px] border-border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">CubeAuthn</CardTitle>
        <CardDescription className="text-muted-foreground">
          {isEditing 
            ? "Change the MAC address of your Bluetooth Rubik's cube"
            : "Enter the MAC address of your Bluetooth Rubik's cube to use for WebAuthn authentication"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="macAddress" className="text-foreground">Cube MAC Address</Label>
            <Input
              id="macAddress"
              placeholder="XX:XX:XX:XX:XX:XX"
              value={inputValue}
              onChange={handleInputChange}
              className={isValid ? "border-input" : "border-destructive"}
            />
            {!isValid && (
              <p className="text-destructive text-xs mt-1">
                Please enter a valid MAC address (format: XX:XX:XX:XX:XX:XX)
              </p>
            )}
          </div>
        </div>
        {isSaved && (
          <p className="text-green-500 text-xs mt-3 font-medium">
            ✓ MAC address saved successfully!
          </p>
        )}
      </CardContent>
      {!hideButtons && (
        <CardFooter className={`flex ${onCancel ? "justify-between" : "justify-end"} gap-2`}>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!isValid || inputValue === ""}
            className={onCancel ? "" : "w-full"}
          >
            {saveButtonText || (isEditing ? "Update MAC Address" : "Save MAC Address")}
          </Button>
        </CardFooter>
      )}
      <div className="p-3 mx-4 mb-4 bg-muted rounded-md">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Note:</span> Go to <pre>chrome://bluetooth-internals</pre> to get the MAC address. You may have to connect the cube to your computer first to get the MAC address and there may be multiple GANXXX devices listed so try both.
          {/* LINK TO GITHUB PAGES https://acorn221.github.io/gan-i3-356-bluetooth/  */}
          <a href="https://acorn221.github.io/gan-i3-356-bluetooth/" target="_blank" rel="noopener noreferrer">
            <Button
              variant="link"
              className="text-xs mt-1"
              rel="noopener noreferrer"
            >
              Example bluetooth connection page
            </Button>
          </a>
        </p>
      </div>
    </Card>
  )
}