const hre = require("hardhat");
const { mumbaiEndpoint, mumbaiChainId, fujiChainId, fujiEndpoint, baseUri } = require("../testnet.config");
const { polygonChainId, polygonEndpoint, avalancheChainId, avalancheEndpoint, fantonChainId, fantomEndpoint, bscChainId, bscEndpoint } = require("../mainnet.config");
const GAS_PRICE = 200000000000; /// 200 GWei

async function main() {
    let LzEndpoint;
    let LzChainId;
    console.log(hre.network.config.chainId)
    if (hre.network.config.chainId === 80001) {
        LzChainId = mumbaiChainId
        LzEndpoint = mumbaiEndpoint
    } else if (hre.network.config.chainId === 43113) {
        LzEndpoint = fujiEndpoint
        LzChainId = fujiChainId
    } else if (hre.network.config.chainId === 137) {
        LzChainId = polygonChainId
        LzEndpoint = polygonEndpoint
    } else if (hre.network.config.chainId === 43114) {
        LzChainId = avalancheChainId
        LzEndpoint = avalancheEndpoint
    } else if (hre.network.config.chainId === 250) {
        LzChainId = fantonChainId
        LzEndpoint = fantomEndpoint
    } else if (hre.network.config.chainId === 56) {
        LzChainId = bscChainId
        LzEndpoint = bscEndpoint
    }

    // Deploy State Handler on the chain.
    const StateHandler = await hre.ethers.getContractFactory("StateHandler");
    const stateHandler = await StateHandler.deploy(LzEndpoint, {
        gasPrice: GAS_PRICE
    });
    console.log(stateHandler)
    await stateHandler.deployed();
    console.log("State Handler Deployed To:", stateHandler.address);

    // // Deploy destination vault on the same chain.
    const SuperDestination = await hre.ethers.getContractFactory("SuperDestination");
    const superDestination = await SuperDestination.deploy(LzChainId, stateHandler.address, {
        gasPrice: GAS_PRICE
    });

    await superDestination.deployed();
    console.log("Destination Vault Deployed To:", superDestination.address);

    // Deploy the source vault in one chain.
    const SuperRouter = await hre.ethers.getContractFactory("SuperRouter");
    const superRouter = await SuperRouter.deploy(LzChainId, baseUri, stateHandler.address, superDestination.address, {
        gasPrice: GAS_PRICE
    });

    await superRouter.deployed();
    console.log("Source Vault Deployed To:", superRouter.address);

    // Deploy the multi-tx processor in one chain.
    const MultiTxProcessor = await hre.ethers.getContractFactory("MultiTxProcessor");
    const multiTxProcessor = await MultiTxProcessor.deploy({
        gasPrice: GAS_PRICE
    });

    await multiTxProcessor.deployed();
    console.log("MultiTx Processor Deployed To:", multiTxProcessor.address);

    const tx1 = await stateHandler.setHandlerController(superRouter.address, superDestination.address, {
        gasPrice: GAS_PRICE
    });
    await tx1.wait();

    const role = await stateHandler.CORE_CONTRACTS_ROLE()

    const tx2 = await stateHandler.grantRole(role, superRouter.address, {
        gasPrice: GAS_PRICE
    });
    await tx2.wait();

    const tx3 = await stateHandler.grantRole(role, superDestination.address, {
        gasPrice: GAS_PRICE
    });
    await tx3.wait();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});