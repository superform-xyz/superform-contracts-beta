require("dotenv").config();

const { ethers } = require("ethers")
const { stateHandler, superDestination, superRouter, multiTxProcessor } = require("../deployments/polygon.json");
const StateHandlerABI = require("../deployments/ABI/StateHandler.abi.json");
const SuperRouterABI = require("../deployments/ABI/SuperRouter.abi.json");
const SuperDestinationABI = require("../deployments/ABI/SuperDestination.abi.json");
const MultiTxProcessorABI = require("../deployments/ABI/MultiTxProcessor.abi.json");
const GAS_PRICE = 200000000000; /// 200 GWei

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL)
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

    const stateHandlerContract = new ethers.Contract(stateHandler, StateHandlerABI, signer)

    const superDestinationContract = new ethers.Contract(superDestination, SuperDestinationABI, signer)

    const superRouterContract = new ethers.Contract(superRouter, SuperRouterABI, signer)

    const multiTxProcessorContract = new ethers.Contract(multiTxProcessor, MultiTxProcessorABI, signer)

    const tx1 = await superDestinationContract.addVault("0x0EBA9b4844B9381b84376C2D98d3E8E1963F63d4", "1371", {
        gasPrice: GAS_PRICE
    })
    console.log("Vault Added: ", tx1.hash);
    await tx1.wait();

    const bridgeAddress1 = "0xc30141B657f4216252dc59Af2e7CdB9D8792e1B0"
    const bridgeAddress2 = "0x2ddf16BA6d0180e5357d5e170eF1917a01b41fc0"

    const tx2 = await superRouterContract.setBridgeAddress(1, bridgeAddress1, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 1 added to Router: ", tx2.hash);
    await tx2.wait();

    const tx3 = await superRouterContract.setBridgeAddress(2, bridgeAddress2, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 2 added to Router: ", tx3.hash);
    await tx3.wait();

    const tx4 = await superDestinationContract.setBridgeAddress(1, bridgeAddress1, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 1 added to Destination: ", tx4.hash);
    await tx4.wait();

    const tx5 = await superRouterContract.setBridgeAddress(2, bridgeAddress2, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 2 added to Destination: ", tx5.hash);
    await tx5.wait();

    const trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], ["0xA57500f1e80218503b298bCeB47B822c4202F3e8", stateHandler])
    const tx6 = await stateHandlerContract.setTrustedRemote("112", trustedRemote, {
        gasPrice: GAS_PRICE
    })
    console.log("Trusted Remote Set For Fantom: ", tx6.hash)
    await tx6.wait();

    const ROUTER_ROLE = await superDestinationContract.ROUTER_ROLE()
    const tx7 = await superDestinationContract.grantRole(ROUTER_ROLE, superRouter, {
        gasPrice: GAS_PRICE
    })
    console.log("Router role added to destination:", tx7.hash)
    await tx7.wait();

    const SAFE_GAS_PARAM = "0x000100000000000000000000000000000000000000000000000000000000004c4b40"
    const tx8 = await superDestinationContract.updateSafeGasParam(SAFE_GAS_PARAM, {
        gasPrice: GAS_PRICE
    })
    console.log("Safe Gas Param added to Super Destination", tx8.hash)
    await tx8.wait()

    const tx9 = await multiTxProcessorContract.setBridgeAddress(1, bridgeAddress1, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 1 added to Multi Tx Processor: ", tx9.hash);
    await tx9.wait();

    const tx10 = await multiTxProcessorContract.setBridgeAddress(2, bridgeAddress2, {
        gasPrice: GAS_PRICE
    });
    console.log("Bridge address 2 added to Multi Tx Processor: ", tx10.hash);
    await tx10.wait();

    const vikAddress = "0xdC6CA6116D69171B4aEA7ACbD1a739Cf7c565F53"

    const PROCESSOR_CONTRACT_ROLE = await stateHandlerContract.PROCESSOR_CONTRACTS_ROLE()
    const tx12 = await stateHandlerContract.grantRole(PROCESSOR_CONTRACT_ROLE, vikAddress, {
        gasPrice: GAS_PRICE
    })
    console.log("Processor role set in state handler polygon (vik): ", tx12.hash)
    await tx12.wait()

    const tx13 = await stateHandlerContract.grantRole(PROCESSOR_CONTRACT_ROLE, signer.address, {
        gasPrice: GAS_PRICE
    })
    console.log("Processor role set in state handler polygon (sujith): ", tx13.hash)
    await tx13.wait()

    const SWAPPER_ROLE = await multiTxProcessorContract.SWAPPER_ROLE()
    const tx14 = await multiTxProcessorContract.grantRole(SWAPPER_ROLE, signer.address, {
        gasPrice: GAS_PRICE
    })
    console.log("Swapper role set in state handler polygon (sujith): ", tx14.hash)
    await tx14.wait()

    const tx15 = await multiTxProcessorContract.grantRole(SWAPPER_ROLE, vikAddress, {
        gasPrice: GAS_PRICE
    })
    console.log("Swapper role set in state handler polygon (sujith): ", tx15.hash)
    await tx15.wait()
}

main().catch((error) => {
    console.log(error);
    process.exitCode = 1;
})