import type { CubeHashConfig } from "@/background/types";

/**
 * Calculate optimal PBKDF2 iterations that can be done in under 50ms
 */
export const calculateIterations = async (): Promise<number> => {
  const testData = new TextEncoder().encode("test");
  const testSalt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = [];
  const targetTimeMs = 50;
  
  // Start with a higher baseline of iterations since PBKDF2 is optimized
  const testIterations = [50000, 100000, 150000, 200000, 250000, 300000, 500000];
  
  // Import the test data as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    testData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Test each iteration count
  for (const iterCount of testIterations) {
    const start = performance.now();
    
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: testSalt,
        iterations: iterCount,
        hash: 'SHA-512'
      },
      keyMaterial,
      256 // 32 bytes output
    );
    
    const end = performance.now();
    const duration = end - start;
    
    iterations.push({ iterations: iterCount, duration });
    
    if (duration > targetTimeMs) {
      break;
    }
  }
  
  // Find the highest iteration count under 50ms
  const safeIterations = iterations
    .filter(item => item.duration < targetTimeMs)
    .pop()?.iterations || 100000;
  return safeIterations;
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
  setCubeScrambleHash: (config: CubeHashConfig) => void
): Promise<string> => {
  try {
    // Calculate safe iteration count
    const iterations = await calculateIterations();
    
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