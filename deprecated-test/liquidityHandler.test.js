/* eslint-disable prettier/prettier */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

describe("Stargate Liquidity Handler Test", async function() {
    beforeEach(async function() {
        this.accounts = await ethers.getSigners();

        const Token = await ethers.getContractFactory("ERC20Mock")
        this.token = await Token.deploy("Test", "TST", this.accounts[0].address, BigNumber.from(3000000))

        const Router = await ethers.getContractFactory("SocketRouterMock")
        this.router = await Router.deploy()

        const Stargate = await ethers.getContractFactory("LiquidityHandler")
        this.stargate = await Stargate.deploy()

        this.stargate.setRegistry(this.router.address)
    })

    it("check if registry is added properly", async function() {
        expect(
            await this.stargate.socketsRegistry()
        ).to.equals(this.router.address)
    })

    it("test socket transfer", async function() {
        await this.token.approve(this.stargate.address, BigNumber.from(3000000))
        const input = [
            [this.token.address, this.accounts[2].address, [this.accounts[0].address, "1", "3000000", ["0", "0", this.accounts[0].address, "0x00"],
                ["7", "0", this.accounts[0].address, "0x00"]
            ]]
        ]
        await this.stargate.outBoundTransfer(input)
    })
})