const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

describe("samechainId base tests:", async() => {
    let FantomSrc;
    let BscSrc;
    let FantomLzEndpoint;
    let FantomDst;
    let BscDst;
    let BscLzEndpoint;
    let accounts;
    let FantomUSDC;
    let BscUSDC;
    let swapToken;
    let FantomVault;
    let BscVault;
    let socket;
    let FantomStateHandler;
    let BscStateHandler;

    let FantomChainId = 1;
    let BscChainId = 2;

    let ThousandTokensE18 = ethers.utils.parseEther("1000");
    let MilionTokensE18 = ethers.utils.parseEther("1000000");

    var BscStateHandlerCounter = 0;
    var FantomStateHandlerCounter = 0;

    let mockEstimatedNativeFee;
    let mockEstimatedZroFee;

    async function depositToVault(
        tokenType,
        targetSource,
        targetDst,
        stateReq,
        liqReq,
        amountToDeposit
    ) {
        // console.log("stateReq", stateReq, "liq", liqReq)
        await tokenType.approve(targetSource.address, amountToDeposit);

        // Mocking gas fee airdrop (native) from layerzero
        await accounts[1].sendTransaction({
            to: targetDst.address,
            value: ethers.utils.parseEther("1"),
        });

        /// Value == fee paid to relayer. API call in our design
        await targetSource.deposit([liqReq], [stateReq], {
            value: ethers.utils.parseEther("1"),
        });
    }

    async function buildCall(
        fromSrc,
        toDst,
        tokenType,
        vaultId,
        amount,
        targetChainId
    ) {
        let socketTxData = socket.interface.encodeFunctionData(
            "mockSocketTransfer", [fromSrc, toDst, tokenType, amount]
        );

        const stateReq = [
            targetChainId, [amount],
            [vaultId],
            [1000], /// hardcoding slippages to 10%
            0x00,
            ethers.utils.parseEther("0.5"),
        ];

        const LiqReq = [
            1,
            socketTxData,
            tokenType,
            socket.address,
            amount,
        ];

        return { stateReq: stateReq, LiqReq: LiqReq };
    }

    before("deploying routerand dsc", async function() {
        try {
            accounts = await ethers.getSigners();

            // Deploying LZ mocks
            const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");
            FantomLzEndpoint = await LZEndpointMock.deploy(FantomChainId);
            BscLzEndpoint = await LZEndpointMock.deploy(BscChainId);

            // Deploying StateHandler
            const StateHandler = await ethers.getContractFactory("StateHandler");
            FantomStateHandler = await StateHandler.deploy(FantomLzEndpoint.address);
            BscStateHandler = await StateHandler.deploy(BscLzEndpoint.address);

            // Deploying Socket mocks
            const SocketRouterMock = await ethers.getContractFactory(
                "SocketRouterMock"
            );
            socket = await SocketRouterMock.deploy();

            mockEstimatedNativeFee = ethers.utils.parseEther("0.001");
            mockEstimatedZroFee = ethers.utils.parseEther("0.00025");

            await FantomLzEndpoint.setEstimatedFees(
                mockEstimatedNativeFee,
                mockEstimatedZroFee
            );
            await BscLzEndpoint.setEstimatedFees(
                mockEstimatedNativeFee,
                mockEstimatedZroFee
            );

            // Deploying mock ERC20 token
            const Token = await ethers.getContractFactory("ERC20Mock");
            FantomUSDC = await Token.deploy(
                "Fantom USDC",
                "FUSDC",
                accounts[0].address,
                MilionTokensE18
            );
            BscUSDC = await Token.deploy(
                "BSC USDC",
                "BUSDC",
                accounts[0].address,
                MilionTokensE18
            );

            const SwapToken = await ethers.getContractFactory("ERC20Mock");
            swapToken = await SwapToken.deploy(
                "Swap",
                "SWP",
                accounts[0].address,
                MilionTokensE18
            );

            // Deploying Mock Vault
            const Vault = await ethers.getContractFactory("VaultMock");
            FantomVault = await Vault.deploy(
                FantomUSDC.address,
                "FantomVault",
                "TSTFantomVault"
            );
            BscVault = await Vault.deploy(BscUSDC.address, "BscVault", "TSTBscVault");

            // Deploying Destination Contract
            const SuperDestinationABI = await ethers.getContractFactory(
                "SuperDestination"
            );
            FantomDst = await SuperDestinationABI.deploy(
                FantomChainId,
                FantomStateHandler.address
            );
            BscDst = await SuperDestinationABI.deploy(
                BscChainId,
                BscStateHandler.address
            );

            // Deploying routerContract
            const SuperRouterABI = await ethers.getContractFactory("SuperRouter");
            FantomSrc = await SuperRouterABI.deploy(
                FantomChainId,
                "test.com/",
                FantomStateHandler.address,
                FantomDst.address
            );
            BscSrc = await SuperRouterABI.deploy(
                BscChainId,
                "test.com/",
                BscStateHandler.address,
                BscDst.address
            );

            // Setting up required initial parameters
            /// @dev why do we need to do it ourselves? we really shouldn't
            await FantomSrc.setTokenChainId(1, BscChainId);
            await BscSrc.setTokenChainId(1, FantomChainId);

            await FantomLzEndpoint.setDestLzEndpoint(
                BscStateHandler.address,
                BscLzEndpoint.address
            );
            await BscLzEndpoint.setDestLzEndpoint(
                FantomStateHandler.address,
                FantomLzEndpoint.address
            );

            await FantomDst.addVault(FantomVault.address, 1);
            await BscDst.addVault(BscVault.address, 1);

            await FantomDst.setSrcTokenDistributor(FantomSrc.address, FantomChainId);
            await BscDst.setSrcTokenDistributor(BscSrc.address, BscChainId);

            await FantomStateHandler.setHandlerController(
                FantomSrc.address,
                FantomDst.address
            );
            await BscStateHandler.setHandlerController(BscSrc.address, BscDst.address);

            const role = await FantomStateHandler.CORE_CONTRACTS_ROLE();
            const role2 = await BscStateHandler.CORE_CONTRACTS_ROLE();

            await FantomStateHandler.grantRole(role, FantomSrc.address);
            await FantomStateHandler.grantRole(role, FantomDst.address);

            await BscStateHandler.grantRole(role2, BscSrc.address);
            await BscStateHandler.grantRole(role2, BscDst.address);

            await FantomStateHandler.setTrustedRemote(
                BscChainId,
                BscStateHandler.address
            );
            await BscStateHandler.setTrustedRemote(
                FantomChainId,
                FantomStateHandler.address
            );

            await FantomSrc.setBridgeAddress(1, socket.address);
            await BscSrc.setBridgeAddress(1, socket.address);
            await BscDst.setBridgeAddress(1, socket.address);
            await FantomDst.setBridgeAddress(1, socket.address);

            const PROCESSOR_CONTRACT_ROLE = await FantomStateHandler.PROCESSOR_CONTRACTS_ROLE()

            await FantomStateHandler.grantRole(PROCESSOR_CONTRACT_ROLE, accounts[0].address)
            await BscStateHandler.grantRole(PROCESSOR_CONTRACT_ROLE, accounts[0].address)
        } catch (err) {
            console.log(err)
        }
    });

    it("verifying deployment contract addresses", async function() {
        // Verifying the deployment params
        expect(await FantomSrc.chainId()).to.equals(1);
        expect(await BscSrc.chainId()).to.equals(2);
        expect(await FantomDst.chainId()).to.equals(1);
        expect(await BscDst.chainId()).to.equals(2);
    });

    it("FTM=>FTM: SAMECHAIN deposit()", async function() {
        const amount = ThousandTokensE18;
        const vaultId = 1;

        const Request = await buildCall(
            FantomSrc.address,
            FantomDst.address,
            FantomUSDC.address,
            vaultId,
            amount,
            FantomChainId
        );

        // Expect Initial Token Balance To Be Zero
        expect(await FantomUSDC.balanceOf(FantomDst.address)).to.equal(0);

        // Depositing To Vault Id 1 On Destination
        await depositToVault(
            FantomUSDC,
            FantomSrc,
            FantomDst,
            Request.stateReq,
            Request.LiqReq,
            amount
        );

        expect(await FantomSrc.balanceOf(accounts[0].address, 1)).to.equal(amount);
        expect(await FantomVault.balanceOf(FantomDst.address)).to.equal(amount);
    });

    it("FTM<=FTM: SAMECHAIN withdraw()", async function() {
        const amount = ThousandTokensE18;
        const vaultId = 1;

        const sharesBalanceBeforeWithdraw = await FantomSrc.balanceOf(
            accounts[0].address,
            1
        );

        const Request = await buildCall(
            FantomDst.address,
            accounts[0].address,
            FantomUSDC.address,
            vaultId,
            amount,
            FantomChainId
        );

        await FantomSrc.withdraw(
            [Request.stateReq], [Request.LiqReq], {
                value: ethers.utils.parseEther("1"),
            }
        );

        const tokenBalanceAfterWithdraw = await FantomUSDC.balanceOf(
            accounts[0].address
        );
        const sharesBalanceAfterWithdraw = await FantomSrc.balanceOf(
            accounts[0].address,
            1
        );

        /// Should be checked against previewRedeem()
        console.log(
            "Wihtdraw call:",
            tokenBalanceAfterWithdraw.toString(),
            "amount",
            amount.toString()
        );
        // expect(tokenBalanceAfterWithdraw).to.equal(amount);
        expect(sharesBalanceBeforeWithdraw).to.equal(amount); /// This is true only because Mock Vaults are empty and it's theirs first deposit! TEST
        expect(sharesBalanceAfterWithdraw).to.equal(0);

    });
});