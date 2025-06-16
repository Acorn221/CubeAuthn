# CubeAuthn

## TODO:
- [/] Tell the user if their mac address isn't setup in the overlay
- [/] Setup the key gen properly, generate a random id with each key that is generated - this can be hashed with the secret+cubeNum to generate the private key
- [ ] Setup the key decoding on for the authentication - calculating the private key from hashing the secret with the given cube number
- [ ] Setup the authentication to actually work
- [ ] Fix state management so when we re-register the cube is correctly displayed
- [ ] Make sure we set the secret to undefined when the user chooses to do so