/* eslint-disable prettier/prettier */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("State Handler Test", function() {
    beforeEach(async function() {
        this.accounts = await ethers.getSigners()

        // use this chainId
        this.chainIdSrc = 1
        this.chainIdDst = 2

        // Deploying LZ mocks 
        const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock")
        this.endpointSrc = await LZEndpointMock.deploy(this.chainIdSrc)
        this.endpointDst = await LZEndpointMock.deploy(this.chainIdDst)

        this.mockEstimatedNativeFee = ethers.utils.parseEther("0.001")
        this.mockEstimatedZroFee = ethers.utils.parseEther("0.00025")

        await this.endpointSrc.setEstimatedFees(this.mockEstimatedNativeFee, this.mockEstimatedZroFee)
        await this.endpointDst.setEstimatedFees(this.mockEstimatedNativeFee, this.mockEstimatedZroFee)

        // Deploying Stargate State Handler
        const StateHandler = await ethers.getContractFactory("StateHandler")
        this.stateHandlerSrc = await StateHandler.deploy(this.chainIdSrc, this.endpointSrc.address)
        this.stateHandlerDst = await StateHandler.deploy(this.chainIdDst, this.endpointDst.address)

        this.endpointSrc.setDestLzEndpoint(this.stateHandlerDst.address, this.endpointDst.address)
        this.endpointDst.setDestLzEndpoint(this.stateHandlerSrc.address, this.endpointSrc.address)
    })

    it("send state from source to destination", async function() {
        await this.stateHandlerSrc.dispatchState(
            this.chainIdDst,
            this.stateHandlerDst.address, [this.accounts[1].address], [100], [this.accounts[0].address], {
                value: ethers.utils.parseEther("0.55")
            }
        )

        const destinationState = await this.stateHandlerDst.recievedState(1)
        expect(destinationState.stateId).to.equals(ethers.utils.parseUnits("1", 0))
        expect(destinationState.txType).to.equals(0)
        expect(destinationState.sourceChainId).to.equals(ethers.utils.parseUnits("1", 0))
    })
})