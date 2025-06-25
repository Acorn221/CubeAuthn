# CubeAuthn

<img src="https://github.com/Acorn221/CubeAuthn/blob/main/assets/icon.png?raw=true" width="25%">

Ever wanted rubiks cube based passkeys? No?! Well here it is anyway!
(Only currently works with GAN 356 i3)

> [!Note]
> Check out the [demo video](https://www.youtube.com/watch?v=-q8KRX0P9gE) to see it in action or [get it here](https://chromewebstore.google.com/detail/cubeauthn/koncigmbjmoapojihipbpfnmgkhmdlfl) on the chrome web store!

> [!WARNING]
> This is a POC and cannot be super secure due to limitations of the Cube's bluetooth protocol

[<img src="https://i.ytimg.com/vi/-q8KRX0P9gE/maxresdefault.jpg" width="100%">](https://www.youtube.com/watch?v=-q8KRX0P9gE "CubeAuthn Demo")

## Features
- Register your cube scramble (and add your cube's MAC address for cube message decryption)
- Save your secret (which is hashed with the cube number) on Local or Sync storage so it syncs with the cloud
- Register and Login with your cube scramble!
- Uses WebAuthn to register and login with your cube scramble (and secret + ID of passkey) to login
- This is as secure as it can be, the cube's bluetooth messages are encrypted with AES-128 and the key is the mac address of the cube. Your secret is stored unencrypted in sync storage by default, but you need the cube's scramble to generate the seeds to generate the passkey's keypair

## Think this is cool?
Star the repo, send in a PR and add me on [LinkedIn](https://www.linkedin.com/in/acorn221/)!

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
