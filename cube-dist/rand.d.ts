/**
 * Type definitions for ModernRandom
 */
export type SeedType = number | number[] | string | null;
export interface InternalState {
    buffer: Uint32Array;
    index: number;
    seed: SeedType;
}
/**
 * Modern replacement for isaac PRNG using Web Crypto API
 * Provides a compatible API with the original isaac implementation
 */
export declare class ModernRandom {
    private _seedData;
    private _seedIndex;
    private _seedBuffer;
    /**
     * Create a new ModernRandom instance
     * @param initialSeed - Optional initial seed value
     */
    constructor(initialSeed?: SeedType);
    /**
     * Generate cryptographically secure random values using Web Crypto
     * or fall back to Math.random if not available
     */
    private generateRandomValues;
    /**
     * Reset the internal state
     */
    reset(): void;
    /**
     * Seed the random number generator
     * @param s - Seed value (number, array of numbers, or string)
     */
    seed(s: SeedType): void;
    /**
     * Get a random 32-bit integer
     * @returns A random 32-bit integer
     */
    rand(): number;
    /**
     * Get a random number between 0 and 1
     * @returns A random number between 0 and 1
     */
    random(): number;
    /**
     * Compatibility function for the original isaac API
     * @param n - Number of iterations (default: 1)
     */
    prng(n?: number): void;
    /**
     * Get/set internal state (for compatibility)
     * @param obj - Optional object to set internal state
     * @returns Current internal state
     */
    internals(obj?: Partial<InternalState>): InternalState;
}
/**
 * Default instance for backward compatibility with the original API
 *
 * This is a singleton instance that provides the same API as the original
 * IIFE implementation, ensuring compatibility with existing code.
 */
export declare const modernRandom: ModernRandom;
//# sourceMappingURL=rand.d.ts.map