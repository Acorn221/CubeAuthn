import type { CubeHashConfig } from "@/background/types";

/**
 * Calculate optimal PBKDF2 iterations that can be done in under a specified time
 * Uses a binary search approach to find a precise iteration count
 */
export const calculateIterations = async (): Promise<number> => {
  const testData = new TextEncoder().encode("test");
  const testSalt = crypto.getRandomValues(new Uint8Array(16));
  const targetTimeMs = 50;
  const fallbackIterations = 100000; // Default if something goes wrong
  
  // Import the test data as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    testData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Helper function to measure duration of PBKDF2 with specific iteration count
  const measureDuration = async (iterations: number): Promise<number> => {
    const start = performance.now();
    
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: testSalt,
        iterations: iterations,
        hash: 'SHA-512'
      },
      keyMaterial,
      256 // 32 bytes output
    );
    
    const end = performance.now();
    return end - start;
  };

  try {
    // Initial calibration to find reasonable bounds
    let lowerBound = 10000;
    let upperBound = 1000000;
    
    // Quick calibration to find reasonable bounds
    const initialDuration = await measureDuration(lowerBound);
    
    if (initialDuration > targetTimeMs) {
      // If even the lower bound is too slow, scale down
      lowerBound = 1000;
      upperBound = 10000;
    } else if (initialDuration < targetTimeMs / 10) {
      // If the lower bound is very fast, we can scale up our search range
      lowerBound = 100000;
      upperBound = 2000000;
    }
    
    // Binary search to find optimal iteration count
    const maxAttempts = 10; // Prevent infinite loops
    let attempts = 0;
    let bestIterations = lowerBound;
    
    while (lowerBound <= upperBound && attempts < maxAttempts) {
      const mid = Math.floor(lowerBound + (upperBound - lowerBound) / 2);
      const duration = await measureDuration(mid);
      
      if (duration <= targetTimeMs) {
        // This iteration count is acceptable, try higher
        bestIterations = mid; // Save this as a valid result
        lowerBound = mid + 1;
      } else {
        // Too slow, try lower
        upperBound = mid - 1;
      }
      
      attempts++;
    }
    
    // Final verification to ensure we're under the target time
    const finalDuration = await measureDuration(bestIterations);
    if (finalDuration > targetTimeMs) {
      // If somehow our best result is still over target, scale back by 10%
      bestIterations = Math.floor(bestIterations * 0.9);
    }
    
    return bestIterations;
  } catch (error) {
    console.error("Error calculating iterations:", error);
    return fallbackIterations;
  }
};

/**
 * Generate a random salt
 */
export const generateSalt = (): Uint8Array => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return array;
};

/**
 * Convert array to hex string
 */
export const arrayToHex = (array: Uint8Array): string => {
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash the cube state with PBKDF2
 */
export const hashWithPBKDF2 = async (
  data: string, 
  salt: Uint8Array, 
  iterations: number
): Promise<string> => {
  // Convert data to bytes
  const dataBytes = new TextEncoder().encode(data);
  
  // Import as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    dataBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-512'
    },
    keyMaterial,
    512 // 64 bytes output
  );
  
  // Convert to hex string
  const hashArray = new Uint8Array(derivedBits);
  return arrayToHex(hashArray);
};

/**
 * Generate hash from cube state using PBKDF2
 */
export const generateHash = async (
  cubeNum: string,
  setCubeScrambleHash: (config: CubeHashConfig) => void,
  storedIterations?: number,
  setStoredIterations?: (iterations: number) => void
): Promise<string> => {
  try {
    // Use stored iterations if available and valid, otherwise calculate
    let iterations: number;
    if (storedIterations && storedIterations > 0) {
      iterations = storedIterations;
      console.log("Using stored iterations:", iterations);
    } else {
      // Calculate safe iteration count
      iterations = await calculateIterations();
      console.log("Calculated new iterations:", iterations);
      
      // Save the calculated iterations if setter is provided
      if (setStoredIterations) {
        setStoredIterations(iterations);
      }
    }
    
    // Generate a random salt
    const saltBytes = generateSalt();
    const salt = arrayToHex(saltBytes);
    
    // Hash the cube state with PBKDF2
    const hash = await hashWithPBKDF2(cubeNum, saltBytes, iterations);
    
    // Save the hash configuration
    setCubeScrambleHash({
      iterations,
      salt,
      hash
    });

    return hash;
  } catch (error) {
    console.error("Error generating hash:", error);
    return "";
  }
};