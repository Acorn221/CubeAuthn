import { useStorage } from '@plasmohq/storage/hook';
import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import "./styles.css";

const Popup = () => {
  const [macAddress, setMacAddress] = useStorage('macAddress', (x: string | undefined) =>
    x === undefined ? "" : x,
  );
  const [inputValue, setInputValue] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // MAC address regex pattern (accepts formats like XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
  const macAddressPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

  useEffect(() => {
    // Initialize input value with stored MAC address
    setInputValue(macAddress);
    // Validate the initial value
    setIsValid(macAddress === "" || macAddressPattern.test(macAddress));
  }, [macAddress]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsValid(value === "" || macAddressPattern.test(value));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (isValid && inputValue !== "") {
      setMacAddress(inputValue);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000); // Hide success message after 3 seconds
    }
  };

  return (
    <div className="p-4 w-[300px] font-sans">
      <h1 className="text-lg font-bold mb-4">Rubik's Cube WebAuthn</h1>
      
      <p className="text-sm mb-4 leading-relaxed">
        Enter the MAC address of your Bluetooth Rubik's cube to connect it for WebAuthn authentication.
      </p>
      
      <div className="mb-4">
        <label
          htmlFor="macAddress"
          className="block mb-2 text-sm font-bold"
        >
          Cube MAC Address:
        </label>
        <input
          id="macAddress"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="XX:XX:XX:XX:XX:XX"
          className={`w-full p-2 box-border rounded text-sm
            ${isValid ? 'border border-gray-300' : 'border border-red-500'}`}
        />
        {!isValid && (
          <p className="text-red-500 text-xs mt-1">
            Please enter a valid MAC address (format: XX:XX:XX:XX:XX:XX)
          </p>
        )}
      </div>
      
      <button
        onClick={handleSave}
        disabled={!isValid || inputValue === ""}
        className={`px-4 py-2 rounded text-sm font-bold text-white
          ${isValid && inputValue !== ""
            ? 'bg-blue-500 cursor-pointer hover:bg-blue-600'
            : 'bg-gray-300 cursor-not-allowed'}`}
      >
        Save MAC Address
      </button>
      
      {isSaved && (
        <p className="text-green-500 text-sm mt-2">
          MAC address saved successfully!
        </p>
      )}
      
      <div className="mt-4 p-3 bg-gray-100 rounded">
        <p className="text-xs m-0 leading-relaxed">
          <strong>Note:</strong> You can find the MAC address in your cube's app or on the device packaging.
          This extension will use this address to connect to your cube when performing WebAuthn operations.
        </p>
      </div>
    </div>
  );
};

export default Popup;
