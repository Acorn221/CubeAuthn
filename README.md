# CubeAuthn

<img src="https://github.com/Acorn221/CubeAuthn/blob/main/assets/icon.png?raw=true" width="25%">

CubeAuthn transforms a Bluetooth-enabled Rubik's cube into a WebAuthn-compatible authenticator by using the cube's physical state to deterministically generate cryptographic keypairs for passkeys.

> [!Note]
> Check out the [demo video](https://www.youtube.com/watch?v=-q8KRX0P9gE) to see it in action or [get it here](https://chromewebstore.google.com/detail/cubeauthn/koncigmbjmoapojihipbpfnmgkhmdlfl) on the Chrome Web Store!

> [!WARNING]
> This is a proof-of-concept implementation. Currently only supports the GAN 356 i3 smart cube.

[<img src="https://i.ytimg.com/vi/-q8KRX0P9gE/maxresdefault.jpg" width="100%">](https://www.youtube.com/watch?v=-q8KRX0P9gE "CubeAuthn Demo")

## Overview

Unlike traditional security tokens that store credentials, CubeAuthn uses the cube's physical state (one of 43 quintillion possible configurations) as part of a cryptographic seed. Keys are generated deterministically only during authentication, eliminating persistent credential storage.

## Features

- WebAuthn/FIDO2 compatible - works with any passkey-enabled website
- Deterministic key generation from cube state + secret
- No credential storage - keys exist only during authentication
- Optional Chrome sync/local support for secret
- Scramble verification before authentication

## Security Model

CubeAuthn explores a different approach to authentication security:
- **No persistent keys**: Cryptographic material is generated on-demand and never stored
- **Physical dependency**: Requires the cube in the exact physical configuration
- **Reduced attack surface**: No stored keys means no keys to extract via side-channel attacks
- **Trade-offs**: Bluetooth communication and browser extension architecture introduce their own vulnerabilities

## Technical Details

- **Architecture**: Browser extension built with Plasmo framework
- **Cube Interface**: Web Bluetooth API for GAN i3 communication
- **Cryptography**: 
  - Ed25519 keypairs derived from cube state
  - PBKDF2-SHA512 for key derivation
  - AES-128 decryption of cube messages
- **WebAuthn Integration**: Intercepts `navigator.credentials` calls via content script injection
- **State Encoding**: Cube configuration encoded as 64-bit integer using mixed-radix system

## Getting Started

1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/cubeauthn/koncigmbjmoapojihipbpfnmgkhmdlfl)
2. Connect your GAN 356 i3 cube
3. Register cube MAC address
4. Set your secret scramble
5. Authenticate on any WebAuthn site

## Contributing

Star the repo, submit PRs, and connect on [LinkedIn](https://www.linkedin.com/in/acorn221/)!

## TODO:
- [x] Tell the user if their mac address isn't setup in the overlay
- [x] Setup the key gen properly, generate a random id with each key that is generated - this can be hashed with the secret+cubeNum to generate the private key
- [x] Setup the key decoding on for the authentication - calculating the private key from hashing the secret with the given cube number
- [x] Setup the authentication to actually work
- [x] Fix state management so when we re-register the cube is correctly displayed
- [x] Have a random UUID generated for each request from bg -> cs/tab so we don't get confused with multiple requests
- [ ] Use an Iframe to display a tab page which handles the connection to the cube
	- Using an Iframe will require the user to click an extra button, but will not show the user that the extension is trying to connect to the cube - worse UX for no greater security.
	- Sidebars CANNOT be used practically either as they cannot be opened upon navigator.credentials.{create, get} functions being called
	- The only solution here would be to open a popup window/new tab to let the user authenticate with the cube.
- [ ] Have an option to use a virtual cube (for testing)
- [ ] Add a timeout timer so we don't overrun the given timeout from the site
- [ ] Make a WASM script to brute force the MAC address on onboarding
- [ ] Make sure we set the secret to undefined when the user chooses to do so
- [ ] Allow the user to encrypt the secret with a device passkey as an extra layer of security
