/* eslint-disable prettier/prettier */
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { expect } = require("chai");

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

        const Token = await ethers.getContractFactory("ERC20Mock")
        this.token = await Token.deploy("Test", "TST", this.accounts[0].address, BigNumber.from(3000000))

        const Router = await ethers.getContractFactory("SocketRouterMock")
        this.router = await Router.deploy()

        const LiquidityHandler = await ethers.getContractFactory("LiquidityHandler")
        this.liquidityHandler = await LiquidityHandler.deploy()

        this.liquidityHandler.setRegistry(this.router.address)

        const SuperRouter = await ethers.getContractFactory("SuperRouter")
        this.SuperRouter = await SuperRouter.deploy(this.stateHandlerSrc.address, this.liquidityHandler.address)
    })

    it("testing setRole capabilities", async function() {
        try {
            await this.SuperRouter.connect(this.accounts[1]).setUserRole(this.accounts[0].address, 0, true);
        } catch (err) {
            // console.log(err)
        }
    })

    it("testing RBAC", async function() {
        const role = await this.SuperRouter.KEEPER_ROLE();
        await this.SuperRouter.grantRole(role, this.accounts[0].address);

        expect(
            await this.SuperRouter.hasRole(role, this.accounts[0].address)
        ).to.equals(true)
    })

    it("Testing source vault requests", async function() {
        // Granting Role 
        const role = await this.SuperRouter.KEEPER_ROLE();
        await this.SuperRouter.grantRole(role, this.accounts[0].address);

        await this.token.approve(this.SuperRouter.address, BigNumber.from(3000000))
        const input = [
            [this.token.address, this.accounts[2].address, [this.accounts[0].address, "1", "3000000", ["0", "0", this.accounts[0].address, "0x00"],
                ["7", "0", this.accounts[0].address, "0x00"]
            ]]
        ]
        await this.SuperRouter.dispatchReq(
            input,
            this.chainIdDst,
            this.stateHandlerDst.address, [this.accounts[1].address], [100], [this.accounts[0].address], {
                value: ethers.utils.parseEther("0.55")
            }
        )
    })
})