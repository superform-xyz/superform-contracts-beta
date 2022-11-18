# Stargate Smart Contracts

![Coverage](https://img.shields.io/badge/coverage-100-success) [![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)

This repository contains the smart contracts of the [Stargate](https://www.stargate.money/) Dapp.

### Table of contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Project structure](#project-structure)
- [Installation](#installation)
- [Testing](#testing)

### Built with

- [LayerZero](https://layerzero.network/) - OmniChain communication Protocol
- [Hardhat](https://hardhat.org/) - Smart Contract Development Suite
- [Solhint](https://protofire.github.io/solhint/) - Linting Suite
- [Prettier](https://github.com/prettier-solidity/prettier-plugin-solidity) - Automatic Code Formatting
- [Solidity](https://docs.soliditylang.org/en/v0.8.6/) - Smart Contract Programming Language
- [Chai](https://www.chaijs.com/) - Smart Contract Testing Language

### Prerequisites

The repository is built using hardhat. So it is recommended to install hardhat globally through npm or yarn using the following commands. Also the development of these smart contracts are done in npm version 6.14.8 & NodeJs version 14.15.0

`sudo npm i -g hardhat`

### Installation

Step by step instructions on setting up the project and running it

1. Clone the repository
   `git clone https://github.com/Stargate-Labs/stargate-contracts`
2. Install Dependencies
   `npm install` or `npm i`
3. Compiling Smart Contracts (Auto compiles all .sol file inside contracts directory)
   `npx hardhat compile`
4. Deploying Smart Contracts
   `npx hardhat run scripts/<contract-name>.deploy.js --network <network-name>`

   > Name of the smart contracts can be found inside the corresponding solidity files of the smart contract

5. Verification of Smart Contracts are configured in deployment scripts.

> All configuration is done in hardhat.config.js & linting configurations are made in .solhint.json & .prettierrc

### Project Folder layout & Structure

    .
    ├── contracts
      ├── interface
      ├── lib
      ├── mocks
      ├── layerzero
      ├── types
      ├── utils
      ├── lzApp
    ├── test
    ├── scripts
    ├── .prettierrc
    ├── .eslintrc.js
    ├── .solcover.js
    ├── .solhint.json
    ├── hardhat.config.js
    ├── package.json
    ├── config.testnet.js
    └── README.md

It makes our project structure easily scannable:

- `contracts` are self-explanatory. All Smart Contract Codes are found inside [/contracts](./contracts)
- `interface` are where we add our custom written interfaces as well as external protocol interfaces [/contracts/interface](./contracts/interface).
- `lib` is where all library contracts are written and re-used in different smart contracts. [/contract/lib](./contracts/lib)
- `lzApp` is where all layezero contracts are done. [/contracts/lzApp](./contracts/scripts)
- `Error.sol` is where all error messages are added for easier debugging. [/contracts/lib/Error.sol](./contracts/lib/helpers/Error.sol)
- `scripts` is where all deployment scripts are done. [/scripts](./scripts)

### Sorting Your Imports

I sort imports in this order:

1. Openzeppelin (or) NPM Contracts
2. Current Contract's Interfaces
3. Other Local Interfaces
4. Library Contracts/Interfaces
5. Tunnel Contracts/Interfaces
6. Type Contract
7. Error Contract

### Testing

For running unit & integration tests:

```sh
$ npm run test
```

For forked state tests with Vault templates:

```sh
$ npm run test:vaults
```

To run coverage:

```sh
$  npm run coverage
```

To run contract size check:

```sh
$ npx hardhat size-contracts
```
