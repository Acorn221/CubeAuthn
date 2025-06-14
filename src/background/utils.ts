import { Storage } from "@plasmohq/storage";

export const getSecret = (
	storage?: Storage,
) => {
	if(!storage) {
		storage = new Storage();
	}

	const secret = storage.get<string>("secret");

	if(!secret) {
		// generate a new secret (32 bytes string) if it doesn't exist
		const newSecret = crypto.getRandomValues(new Uint8Array(32)).reduce((data, byte) => data + String.fromCharCode(byte), "");
		storage.set("secret", newSecret);

		return newSecret;
	}

	return secret;
}

// export const addKeys = async ({
// 	storage,
// 	keys,
// }: {
// 	 storage?: Storage;
// 	 keys: 
// }) => {

// }