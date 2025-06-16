/**
 * Simplified CBOR encoder for WebAuthn
 *
 * Note: Using 'any' type here is necessary because of the recursive nature of CBOR data.
 * TypeScript cannot properly type check recursive structures like this without excessive complexity.
 */
export const encodeCBOR = (val: any): Uint8Array => {
  try {
    if (val instanceof Uint8Array) {
      const len = val.length
      if (len < 24) {
        return new Uint8Array([0x40 + len, ...val])
      } else if (len < 256) {
        return new Uint8Array([0x58, len, ...val])
      } else {
        return new Uint8Array([0x59, (len >> 8) & 0xff, len & 0xff, ...val])
      }
    }

    if (typeof val === "string") {
      const strBytes = new TextEncoder().encode(val)
      const len = strBytes.length
      if (len < 24) {
        return new Uint8Array([0x60 + len, ...strBytes])
      } else if (len < 256) {
        return new Uint8Array([0x78, len, ...strBytes])
      } else {
        return new Uint8Array([
          0x79,
          (len >> 8) & 0xff,
          len & 0xff,
          ...strBytes
        ])
      }
    }

    if (typeof val === "number") {
      if (val >= 0 && val < 24) return new Uint8Array([val])
      if (val >= 0 && val < 256) return new Uint8Array([0x18, val])
      if (val < 0 && val > -25)
        return new Uint8Array([0x20 + Math.abs(val) - 1])
      return new Uint8Array([
        val < 0 ? 0x38 : 0x18,
        Math.abs(val < 0 ? val + 1 : val)
      ])
    }

    if (val instanceof Map) {
      const entries = Array.from(val.entries())
      const size = entries.length

      const header =
        size < 24
          ? [0xa0 + size]
          : size < 256
            ? [0xb8, size]
            : [0xb9, (size >> 8) & 0xff, size & 0xff]

      const parts = [new Uint8Array(header)]

      // TypeScript can't handle the recursive nature of this function with complex types
      for (const [k, v] of entries) {
        // @ts-expect-error - Recursive CBOR encoding is too complex for TypeScript to type check
        parts.push(encodeCBOR(k))
        // @ts-expect-error - Recursive CBOR encoding is too complex for TypeScript to type check
        parts.push(encodeCBOR(v))
      }

      // Concatenate all parts
      const totalLength = parts.reduce((acc, part) => acc + part.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const part of parts) {
        result.set(part, offset)
        offset += part.length
      }

      return result
    }

    // Default fallback
    return new Uint8Array([0xa0]) // Empty map
  } catch (e) {
    console.error("CBOR encoding error:", e)
    return new Uint8Array([0xa0]) // Empty map as fallback
  }
}
