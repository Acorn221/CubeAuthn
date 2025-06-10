/**
 * AES-128 encryption/decryption implementation in TypeScript
 */
export declare class AES128 {
    private static readonly Sbox;
    private static readonly ShiftTabI;
    private static SboxI;
    private static xtime;
    key: number[];
    iv?: number[];
    constructor(key: number[]);
    private static init;
    private static addRoundKey;
    private static shiftSubAdd;
    private static shiftSubAddI;
    private static mixColumns;
    private static mixColumnsInv;
    /**
     * Decrypts a 16-byte block using AES-128
     * @param block - 16-byte block to decrypt (will be mutated)
     * @returns The same block array (mutated)
     */
    decrypt(block: number[]): number[];
    /**
     * Encrypts a 16-byte block using AES-128
     * @param block - 16-byte block to encrypt (will be mutated)
     * @returns The same block array (mutated)
     */
    encrypt(block: number[]): number[];
}
//# sourceMappingURL=aes128.d.ts.map