const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Contract } = require("ethers");
const ForkConfig = require("../config/forkedAddresses.js");
const {
  impersonateAccount,
  stopImpersonatingAccount,
} = require("@nomicfoundation/hardhat-network-helpers");

require("dotenv").config();

describe("strategies base tests:", async () => {
  let FantomSrc;
  let BscSrc;
  let FantomLzEndpoint;
  let FantomDst;
  let BscDst;
  let BscLzEndpoint;
  let accounts;
  let socket;
  let FantomStateHandler;
  let BscStateHandler;

  let whaleAcc;
  let TokenImpersonated;
  let StrategyVault;

  let FantomChainId = 1;
  let BscChainId = 2;

  let ThousandTokensE18 = ethers.utils.parseEther("1000");
  let TenTousandTokensE18 = ethers.utils.parseEther("10000");
  let MilionTokensE18 = ethers.utils.parseEther("1000000");

  var BscStateHandlerCounter = 0;
  var FantomStateHandlerCounter = 0;

  let mockEstimatedNativeFee;
  let mockEstimatedZroFee;

  async function depositToVault(
    signer,
    tokenType,
    targetSource,
    targetDst,
    stateReq,
    liqReq,
    amountToDeposit
  ) {
    // We stick with whaleAcc impersonation
    const _tokenType = await tokenType.connect(signer);
    const _targetSource = await targetSource.connect(signer);

    await _tokenType.approve(targetSource.address, amountToDeposit);

    // Mocking gas fee airdrop (native) from layerzero
    await accounts[1].sendTransaction({
      to: targetDst.address,
      value: ethers.utils.parseEther("1"),
    });

    /// Value == fee paid to relayer. API call in our design
    await _targetSource.deposit([liqReq], [stateReq], {
      value: ethers.utils.parseEther("1"),
    });
  }

  async function buildDepositCall(
    fromSrc,
    toDst,
    tokenType,
    vaultId,
    amount,
    targetChainId
  ) {
    let socketTxData = socket.interface.encodeFunctionData(
      "mockSocketTransfer",
      [fromSrc, toDst, tokenType, amount]
    );

    const stateReq = [
      targetChainId,
      [amount],
      [vaultId],
      0x00,
      ethers.utils.parseEther("0.5"),
    ];

    const LiqReq = [
      socket.address,
      socketTxData,
      tokenType,
      socket.address,
      amount,
    ];

    return { stateReq: stateReq, LiqReq: LiqReq };
  }

  async function buildWithdrawCall(
    fromSrc,
    toDst,
    tokenType,
    vaultId,
    tokenAmount, /// == shares before withdraw, ERR!
    sharesAmount,
    targetChainId
  ) {
    let socketTxData = socket.interface.encodeFunctionData(
      "mockSocketTransfer",
      [fromSrc, toDst, tokenType, tokenAmount]
    );

    /// iterates vaultIds and calls vault.redeem()
    const stateReq = [
      targetChainId,
      [sharesAmount], /// amount is irrelevant on processWithdraw, err?
      [vaultId],
      0x00,
      ethers.utils.parseEther("0.5"),
    ];

    /// withdraw uses this to sent tokens
    const LiqReq = [
      socket.address,
      socketTxData,
      tokenType,
      socket.address,
      tokenAmount,
    ];

    return { stateReq: stateReq, LiqReq: LiqReq };
  }

  async function deployAaveStrategy(
    vault,
    token,
    aToken,
    aaveMining,
    leningPool,
    rewardToken,
    whaleAddr
  ) {
    const _vault = await ethers.getContractFactory(vault);
    StrategyVault = await _vault.deploy(
      token,
      aToken,
      aaveMining,
      leningPool,
      rewardToken,
      accounts[0].address
    );

    await impersonateAccount(whaleAddr);
    whaleAcc = await ethers.getSigner(whaleAddr);
    const ERC20_ABI = await hre.artifacts.readArtifact("ERC20Mock");
    TokenImpersonated = new Contract(token, ERC20_ABI.abi, whaleAcc);
    await TokenImpersonated.transfer(accounts[0].address, TenTousandTokensE18);

    /// For some reason hh fails to stopImpersonating when invoked through hardhat_reset.
    /// We stick with whaleAcc.
    // await stopImpersonatingAccount(whaleAddr);
  }

  describe("Strategies Infra Setup", async () => {
    before("Deploying FTM Geist Fork Infra", async function () {
      accounts = await ethers.getSigners();

      /// For AAVE do P0lygon
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.FANTOM_RPC_URL,
            },
          },
        ],
      });
      const DAI_whale = "0x1ca60862a771f1f47d94f87bebe4226141b19c9c";
      await deployAaveStrategy(
        "AaveV2StrategyWrapper",
        ForkConfig.GEIST_FANTOM_AAVE.gDAI.asset,
        ForkConfig.GEIST_FANTOM_AAVE.gDAI.aToken,
        ForkConfig.GEIST_FANTOM_AAVE.aaveMining,
        ForkConfig.GEIST_FANTOM_AAVE.lendingPool,
        ForkConfig.GEIST_FANTOM_AAVE.GeistToken,
        DAI_whale
      );

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

      await BscDst.addVault(StrategyVault.address);

      await FantomDst.setSrcTokenDistributor(FantomSrc.address, FantomChainId);
      await BscDst.setSrcTokenDistributor(BscSrc.address, BscChainId);

      await FantomStateHandler.setHandlerController(
        FantomSrc.address,
        FantomDst.address
      );
      await BscStateHandler.setHandlerController(
        BscSrc.address,
        BscDst.address
      );

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
    });

    it("verifying deployment contract addresses", async function () {
      // Verifying the deployment params
      expect(await FantomSrc.chainId()).to.equals(1);
      expect(await BscSrc.chainId()).to.equals(2);
      expect(await FantomDst.chainId()).to.equals(1);
      expect(await BscDst.chainId()).to.equals(2);
    });

    it("AaveV2StrategyWrapper (Geist FTM) : user DEPOSIT", async function () {
      const amount = ThousandTokensE18;
      const vaultId = 1;

      const tokenBalanceBeforeWithdraw = await TokenImpersonated.balanceOf(
        whaleAcc.address
      );

      const Request = await buildDepositCall(
        FantomSrc.address,
        BscDst.address,
        TokenImpersonated.address,
        vaultId,
        amount,
        BscChainId
      );

      expect(await TokenImpersonated.balanceOf(BscDst.address)).to.equal(0);

      await depositToVault(
        whaleAcc,
        TokenImpersonated,
        FantomSrc,
        BscDst,
        Request.stateReq,
        Request.LiqReq,
        amount
      );

      const tokenBalanceAfterWithdraw = await TokenImpersonated.balanceOf(
        whaleAcc.address
      );

      console.log(
        "tokenBalanceAfterWithdraw:",
        ethers.utils.formatUnits(tokenBalanceAfterWithdraw),
        "tokenBalanceBeforeWithdraw",
        ethers.utils.formatUnits(tokenBalanceBeforeWithdraw)
      );

      expect(await TokenImpersonated.balanceOf(BscDst.address)).to.equal(
        amount
      );

      ++BscStateHandlerCounter;
      await BscStateHandler.processPayload(BscStateHandlerCounter, {
        value: ethers.utils.parseEther("1"),
      });

      ++FantomStateHandlerCounter;
      await FantomStateHandler.processPayload(FantomStateHandlerCounter, {
        value: ethers.utils.parseEther("1"),
      });

      expect(await FantomSrc.balanceOf(whaleAcc.address, 1)).to.equal(amount);
      expect(await TokenImpersonated.balanceOf(BscDst.address)).to.equal(0);
      expect(await StrategyVault.balanceOf(BscDst.address)).to.equal(amount); /// TEST, this is initial deposit!
    });

    it("AaveV2StrategyWrapper (Geist FTM) : user REDEEM", async function () {
      const vaultId = 1;
      const _FantomSrc = await FantomSrc.connect(whaleAcc);
    
      const sharesBalanceBeforeWithdraw = await _FantomSrc.balanceOf(
        whaleAcc.address,
        1
      );
  
      const assetsToWithdraw = await StrategyVault.previewRedeem(
        sharesBalanceBeforeWithdraw
      );
      console.log(
        "previewReedem/assetsToWithdraw",
        ethers.utils.formatUnits(assetsToWithdraw)
      );
      const tokenBalanceBeforeWithdraw = await TokenImpersonated.balanceOf(
        whaleAcc.address
      );
  
      const Request = await buildWithdrawCall(
        BscDst.address,
        whaleAcc.address,
        TokenImpersonated.address,
        vaultId,
        assetsToWithdraw,
        sharesBalanceBeforeWithdraw,
        0
      );
  
      await _FantomSrc.withdraw(
        [vaultId],
        [sharesBalanceBeforeWithdraw],
        [Request.LiqReq],
        accounts[0].address,
        "0x",
        {
          value: ethers.utils.parseEther("1"),
        }
      );
  
      ++BscStateHandlerCounter;
      await BscStateHandler.processPayload(BscStateHandlerCounter, {
        value: ethers.utils.parseEther("1"),
      });
  
      const tokenBalanceAfterWithdraw = await TokenImpersonated.balanceOf(
        whaleAcc.address
      );
      const sharesBalanceAfterWithdraw = await _FantomSrc.balanceOf(
        whaleAcc.address,
        1
      );
  
      console.log(
        "tokenBalanceAfterWithdraw:",
        ethers.utils.formatUnits(tokenBalanceAfterWithdraw),
        "tokenBalanceBeforeWithdraw",
        ethers.utils.formatUnits(tokenBalanceBeforeWithdraw)
      );
  
      expect(sharesBalanceAfterWithdraw).to.equal(0);
      expect(await FantomSrc.balanceOf(whaleAcc.address, 1)).to.equal(0);
      // expect(await TokenImpersonated.balanceOf(whaleAcc.address)).to.equal(tokenBalanceAfterWithdraw.add(assetsToWithdraw)); /// @dev Precission loss?

    });

  });
});
