/**
 * Base64url encoding/decoding utilities
 */
export const b64url = {
	/**
	 * Encodes binary data to base64url format
	 */
	encode(buffer: ArrayBuffer | Uint8Array | number[]): string {
		try {
			// Convert input to Uint8Array
			const bytes =
				buffer instanceof ArrayBuffer
					? new Uint8Array(buffer)
					: buffer instanceof Uint8Array
						? buffer
						: Array.isArray(buffer)
							? new Uint8Array(buffer)
							: new Uint8Array()

			// Convert to binary string and encode
			const binary = Array.from(bytes)
				.map((byte) => String.fromCharCode(byte))
				.join("")

			return btoa(binary)
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=+$/, "")
		} catch (e) {
			console.error("Base64url encoding error:", e)
			return ""
		}
	},

	/**
	 * Decodes base64url string to binary data
	 */
	decode(str: string | ArrayBuffer | ArrayBufferView): Uint8Array {
		try {
			// Handle non-string or empty input
			if (!str) return new Uint8Array(0)

			// Handle ArrayBuffer/TypedArray directly
			if (typeof str === "object" && "byteLength" in str) {
				return new Uint8Array(
					str instanceof ArrayBuffer ? str : new Uint8Array(str.buffer)
				)
			}

			// Process string input
			const input = String(str)
			const base64 = input.replace(/-/g, "+").replace(/_/g, "/")

			// Add padding if needed
			const padded = base64.padEnd(
				base64.length + ((4 - (base64.length % 4)) % 4),
				"="
			)

			// Decode and convert to Uint8Array
			const binary = atob(padded)
			return Uint8Array.from([...binary].map((char) => char.charCodeAt(0)))
		} catch (e) {
			console.error("Base64url decoding error:", e)
			return new Uint8Array(0)
		}
	}
}
