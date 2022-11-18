/* eslint-disable prettier/prettier */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

describe("SuperDestination Basic Test", function() {
    let deployer;
    let user;
    let stateHandlerSrc;
    let SuperDestination;
    let strategyVault;
    let underlyingToken;
    const chainIdSrc = 1;
    const chainIdDst = 2;

    function getBigNumber(amount, decimals = 18) {
        return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));
    }

    before(async function() {
        [deployer, user] = await ethers.getSigners()

        // Deploying LZ mocks 
        const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock")
        const endpointSrc = await LZEndpointMock.deploy(chainIdSrc)
        const endpointDst = await LZEndpointMock.deploy(chainIdDst)
        const mockEstimatedNativeFee = ethers.utils.parseEther("0.001")
        const mockEstimatedZroFee = ethers.utils.parseEther("0.00025")
        await endpointSrc.setEstimatedFees(mockEstimatedNativeFee, mockEstimatedZroFee)
        await endpointDst.setEstimatedFees(mockEstimatedNativeFee, mockEstimatedZroFee)

        // Deploying Stargate State Handler only on Source for testing
        const StateHandler = await ethers.getContractFactory("StateHandler")
        stateHandlerSrc = await StateHandler.deploy(chainIdSrc, endpointSrc.address)

        /// stateHandlerDst implementation inside of SuperDestination contract
        const destinationFactory = await ethers.getContractFactory("SuperDestination");
        const strategyFactory = await ethers.getContractFactory("VaultMock");
        const underlyingFactory = await ethers.getContractFactory("UnderlyingMock");

        SuperDestination = await destinationFactory.deploy(
            chainIdDst,
            endpointDst.address
        );

        await endpointSrc.setDestLzEndpoint(SuperDestination.address, endpointDst.address) /// SuperDestination is StateHandler
        await endpointDst.setDestLzEndpoint(stateHandlerSrc.address, endpointSrc.address)
        underlyingToken = await underlyingFactory.deploy();
        await underlyingToken.mint(getBigNumber(1000));
        strategyVault = await strategyFactory.deploy(
            underlyingToken.address,
            "MOCK TOKEN VAULT",
            "mDAI",
        );

        await SuperDestination.addVault(strategyVault.address);
        await underlyingToken.approve(SuperDestination.address, getBigNumber(999));
        await SuperDestination.socketReceiver(underlyingToken.address, user.address, getBigNumber(999), strategyVault.address);
        await stateHandlerSrc.dispatchState(
            chainIdDst,
            SuperDestination.address, [user.address], [999], [strategyVault.address], {
                value: ethers.utils.parseEther("0.55")
            }
        )
    })

    it("dispatch msg to SuperDestination", async() => {
        const destinationState = await SuperDestination.recievedState(1)
        expect(destinationState.stateId).to.equals(ethers.utils.parseUnits("1", 0))
        expect(destinationState.txType).to.equals(0)
        expect(destinationState.sourceChainId).to.equals(ethers.utils.parseUnits("1", 0))
    });

    it("readStateDeposit", async() => {
        await SuperDestination.readStateDeposit(1);
    });
})