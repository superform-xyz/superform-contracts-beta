const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ethers = require('ethers');

const ABI = [{
        "inputs": [{
            "internalType": "address",
            "name": "endpoint_",
            "type": "address"
        }],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": false,
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "_nonce",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "_payload",
                "type": "bytes"
            }
        ],
        "name": "MessageFailed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "previousAdminRole",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "newAdminRole",
                "type": "bytes32"
            }
        ],
        "name": "RoleAdminChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "RoleGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "RoleRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": false,
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            }
        ],
        "name": "SetTrustedRemote",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "CORE_CONTRACTS_ROLE",
        "outputs": [{
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "DEFAULT_ADMIN_ROLE",
        "outputs": [{
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "destinationContract",
        "outputs": [{
            "internalType": "contract IDestination",
            "name": "",
            "type": "address"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "dstChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            },
            {
                "internalType": "bytes",
                "name": "adapterParam",
                "type": "bytes"
            }
        ],
        "name": "dispatchState",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            },
            {
                "internalType": "uint64",
                "name": "",
                "type": "uint64"
            }
        ],
        "name": "failedMessages",
        "outputs": [{
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            }
        ],
        "name": "forceResumeReceive",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_version",
                "type": "uint16"
            },
            {
                "internalType": "uint16",
                "name": "_chainId",
                "type": "uint16"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_configType",
                "type": "uint256"
            }
        ],
        "name": "getConfig",
        "outputs": [{
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "bytes32",
            "name": "role",
            "type": "bytes32"
        }],
        "name": "getRoleAdmin",
        "outputs": [{
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "grantRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "hasRole",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            }
        ],
        "name": "isTrustedRemote",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lzEndpoint",
        "outputs": [{
            "internalType": "contract ILayerZeroEndpoint",
            "name": "",
            "type": "address"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            },
            {
                "internalType": "uint64",
                "name": "_nonce",
                "type": "uint64"
            },
            {
                "internalType": "bytes",
                "name": "_payload",
                "type": "bytes"
            }
        ],
        "name": "lzReceive",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            },
            {
                "internalType": "uint64",
                "name": "_nonce",
                "type": "uint64"
            },
            {
                "internalType": "bytes",
                "name": "_payload",
                "type": "bytes"
            }
        ],
        "name": "nonblockingLzReceive",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{
            "internalType": "address",
            "name": "",
            "type": "address"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }],
        "name": "payload",
        "outputs": [{
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "payloadHistory",
        "outputs": [{
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }],
        "name": "payloadProcessed",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint256",
            "name": "payloadId",
            "type": "uint256"
        }],
        "name": "processPayload",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "renounceRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            },
            {
                "internalType": "uint64",
                "name": "_nonce",
                "type": "uint64"
            },
            {
                "internalType": "bytes",
                "name": "_payload",
                "type": "bytes"
            }
        ],
        "name": "retryMessage",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "revokeRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_version",
                "type": "uint16"
            },
            {
                "internalType": "uint16",
                "name": "_chainId",
                "type": "uint16"
            },
            {
                "internalType": "uint256",
                "name": "_configType",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "_config",
                "type": "bytes"
            }
        ],
        "name": "setConfig",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint16",
            "name": "_version",
            "type": "uint16"
        }],
        "name": "setReceiveVersion",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "contract ISource",
                "name": "source_",
                "type": "address"
            },
            {
                "internalType": "contract IDestination",
                "name": "destination_",
                "type": "address"
            }
        ],
        "name": "setSameChainParams",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint16",
            "name": "_version",
            "type": "uint16"
        }],
        "name": "setSendVersion",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "uint16",
                "name": "_srcChainId",
                "type": "uint16"
            },
            {
                "internalType": "bytes",
                "name": "_srcAddress",
                "type": "bytes"
            }
        ],
        "name": "setTrustedRemote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "sourceContract",
        "outputs": [{
            "internalType": "contract ISource",
            "name": "",
            "type": "address"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "bytes4",
            "name": "interfaceId",
            "type": "bytes4"
        }],
        "name": "supportsInterface",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
        }],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "uint16",
            "name": "",
            "type": "uint16"
        }],
        "name": "trustedRemoteLookup",
        "outputs": [{
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
];

const ADDRESS = "0xfC6e1e0ABB18d14728671748c983674030814FEf";

exports.handler = async function(event) {
    const provider = new DefenderRelayProvider(event);
    const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });
    // Use provider and signer for querying or sending txs from ethers, for example...
    const contract = new ethers.Contract(ADDRESS, ABI, signer);

    const currentPayloadId = await contract.payloadHistory();

    for (let i = 6; i <= currentPayloadId; i++) {
        const payload = await contract.payload(i);
        const data = ethers.utils.defaultAbiCoder.decode(
            ["tuple(address,uint16,uint16,uint256,uint256[],uint256[],bytes,uint256)"], payload
        );
        const txType = ethers.utils.formatUnits(data[0][3], 0);
        const status = await contract.payloadProcessed(i);
        if (status === false) {
            if (txType == 0) {
                const tx = await contract.processPayload(i, { value: ethers.utils.parseEther("10") });
                console.log(`Depsoit Transaction Hash For PayloadID ${i}: ${tx.hash}`);
            } else {
                const tx = await contract.processPayload(i);
                console.log(`Withdraw Transaction Hash For PayloadID ${i}: ${tx.hash}`);
            }
        } else {
            console.log(`Already Processed Protocol Id: ${i}`)
        }
    }
}