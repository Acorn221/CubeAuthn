# CubeAuthn

<img src="https://github.com/Acorn221/CubeAuthn/blob/main/assets/icon.png?raw=true" width="25%">

CubeAuthn transforms a Bluetooth-enabled Rubik's cube into a WebAuthn-compatible authenticator by using the cube's physical state to deterministically generate cryptographic keypairs for passkeys.

[Here's the link to the paper](https://ieeexplore.ieee.org/document/11280260) 

> [!Note]
> Check out the [demo video](https://www.youtube.com/watch?v=-q8KRX0P9gE) to see it in action or [get it here](https://chromewebstore.google.com/detail/cubeauthn/koncigmbjmoapojihipbpfnmgkhmdlfl) on the Chrome Web Store!

> [!WARNING]
> This is a proof-of-concept implementation. Currently only supports the GAN 356 i3 smart cube and this implementation is not secure and cannot be made secur with the current firmware of the GAN365 i3 as it broadcasts weakly encrypted messages, including the cube state, along with other issues which make it not practical for real world use.

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

## Cite the paper

```LaTeX
@INPROCEEDINGS{11280260,
  author={Arnott, James and Zhang, Li},
  booktitle={2025 International Conference on Machine Learning and Cybernetics (ICMLC)}, 
  title={From Puzzle to Passkey: Physical Authentication Through Rubik’s Cube Scrambles}, 
  year={2025},
  volume={},
  number={},
  pages={522-527},
  keywords={Bluetooth;Authentication;Transforms;Machine learning;Vectors;Browsers;Cryptography;System analysis and design;Standards;Faces;Passkey;FIDO;WebAuthn;Rubik's Cube;Physical Authentication;Deterministic Key Generation},
  doi={10.1109/ICMLC66258.2025.11280260}}
```
