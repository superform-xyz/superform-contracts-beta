/**
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC4626} from "./interface/IERC4626.sol";

import {StateHandler} from "./layerzero/stateHandler.sol";
import {LiquidityHandler} from "./socket/liquidityHandler.sol";

import {StateData, TransactionType, CallbackType} from "./types/lzTypes.sol";
import {LiqRequest} from "./types/socketTypes.sol";
import {IStateHandler} from "./interface/layerzero/IStateHandler.sol";

/**
 * @title Super Destination
 * @author Zeropoint Labs.
 *
 * Deposits/Withdraw users funds from an input valid vault.
 * extends Socket's Liquidity Handler.
 * @notice access controlled is expected to be removed due to contract sizing.
 */
contract SuperDestination is AccessControl, LiquidityHandler {
    /* ================ Constants =================== */
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    /* ================ State Variables =================== */

    /**
     * @notice state variable are all declared public to avoid creating functions to expose.
     *
     * @dev stateHandler points to the state handler interface deployed in the respective chain.
     * @dev safeGasParam is used while sending layerzero message from destination to router.
     * @dev chainId represents the layerzero chain id of the specific chain.
     */
    IStateHandler public stateHandler;
    bytes public safeGasParam;
    uint16 public chainId;

    /**
     * @dev bridge id is mapped to a bridge address (to prevent interaction with unauthorized bridges)
     * @dev maps state data to its unique id for record keeping.
     * @dev maps a vault id to its address.
     */
    mapping(uint8 => address) public bridgeAddress;
    mapping(uint256 => StateData) public dstState;
    mapping(uint256 => IERC4626) public vault;
    mapping(uint16 => address) public shareHandler;

    /* ================ Events =================== */

    event VaultCreated(uint256 id, IERC4626 vault);
    event TokenDistributorAdded(address routerAddress, uint16 chainId);
    event Processed(
        uint16 srcChainID,
        uint16 dstChainId,
        uint256 txId,
        uint256 amounts,
        uint256 vaultId
    );
    event SafeGasParamUpdated(bytes oldParam, bytes newParam);
    event SetBridgeAddress(uint256 bridgeId, address bridgeAddress);

    /* ================ Constructor =================== */
    /**
     * @notice deploy stateHandler before SuperDestination
     *
     * @param chainId_              Layerzero chain id
     * @param stateHandler_         State handler address deployed
     *
     * @dev sets caller as the admin of the contract.
     */
    constructor(uint16 chainId_, IStateHandler stateHandler_) {
        chainId = chainId_;
        stateHandler = stateHandler_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* ================ Write Functions =================== */
    receive() external payable {}

    /**
     * @dev handles the state when received from the source chain.
     *
     * @param _payload     represents the payload id associated with the transaction.
     *
     * Note: called by external keepers when state is ready.
     */
    function stateSync(bytes memory _payload) external payable {
        require(
            msg.sender == address(stateHandler),
            "Destination: request denied"
        );
        StateData memory data = abi.decode(_payload, (StateData));
        for (uint256 i = 0; i < data.vaultIds.length; i++) {
            if (data.txType == TransactionType.DEPOSIT) {
                if (
                    IERC20(vault[data.vaultIds[i]].asset()).balanceOf(
                        address(this)
                    ) >= data.amounts[i]
                ) {
                    processDeposit(data);
                } else {
                    revert("Destination: Bridge Tokens Pending");
                }
            } else {
                processWithdrawal(data);
            }
        }
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev Soon to be moved to a factory contract. (Post Wormhole Implementation)
     *
     * @param _vaultAddress     address of ERC4626 interface compilant Vault
     * @param _vaultId          represents the unique vault id added to a vault.
     *
     * Note The whitelisting of vault prevents depositing funds to malicious vaults.
     */
    function addVault(IERC4626 _vaultAddress, uint256 _vaultId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            vault[_vaultId] == IERC4626(address(0)),
            "Destination: Vault Already Added"
        );
        require(
            _vaultAddress != IERC4626(address(0)),
            "Destination: Zero Vault Address"
        );

        uint256 id = _vaultId;
        vault[id] = _vaultAddress;

        ///@dev pre-approve, only one type of asset is needed anyway
        IERC20(_vaultAddress.asset()).approve(
            address(_vaultAddress),
            type(uint256).max
        );

        emit VaultCreated(id, _vaultAddress);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     *
     * @dev whitelists the router contract of different chains.
     * @param _sharesHandler    represents the address of router contract.
     * @param _srcChainId       represents the chainId of the source contract.
     */
    function setSrcTokenDistributor(address _sharesHandler, uint16 _srcChainId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_sharesHandler != address(0), "Destination: Zero Address");
        require(_srcChainId != 0, "Destination: Invalid Chain Id");

        shareHandler[_srcChainId] = _sharesHandler;

        /// @dev because directDeposit/Withdraw is only happening from the sameChain, we can use this param
        _setupRole(ROUTER_ROLE, _sharesHandler);
        emit TokenDistributorAdded(_sharesHandler, _srcChainId);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     *
     * @dev adds the gas overrides for layerzero.
     * @param _param    represents adapterParams V2.0 of layerzero
     */
    function updateSafeGasParam(bytes memory _param)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_param.length != 0, "Destination: Invalid Gas Override");
        bytes memory oldParam = safeGasParam;
        safeGasParam = _param;

        emit SafeGasParamUpdated(oldParam, _param);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev allows admin to set the bridge address for an bridge id.
     * @param _bridgeId         represents the bridge unqiue identifier.
     * @param _bridgeAddress    represents the bridge address.
     */
    function setBridgeAddress(uint8 _bridgeId, address _bridgeAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_bridgeAddress != address(0), "Router: Zero Bridge Address");

        bridgeAddress[_bridgeId] = _bridgeAddress;
        emit SetBridgeAddress(_bridgeId, _bridgeAddress);
    }

    /**
     * PREVILAGED router ONLY FUNCTION.
     *
     * @dev process same chain id deposits
     * @param _user     represents address of the depositing user.
     * @param _vaultIds  array of vaultIds on the chain to make a deposit
     * @param _amounts  array of amounts to be deposited in each corresponding _vaultIds
     */
    function directDeposit(
        address _user,
        uint256[] memory _vaultIds,
        uint256[] memory _amounts
    ) external onlyRole(ROUTER_ROLE) returns (uint256[] memory dstAmounts) {
        dstAmounts = new uint256[](_vaultIds.length);
        for (uint256 i = 0; i < _vaultIds.length; i++) {
            IERC4626 v = vault[_vaultIds[i]];
            dstAmounts[i] = v.deposit(_amounts[i], address(this));
        }
        /// @dev no need to store SourceData if only SuperRouter is allowed to call
    }

    /**
     * PREVILAGED router ONLY FUNCTION.
     *
     * @dev process withdrawal of collateral from a vault
     * @param _user     represents address of the depositing user.
     * @param _vaultIds  array of vaultIds on the chain to make a deposit
     * @param _amounts  array of amounts to be deposited in each corresponding _vaultIds
     */
    function directWithdraw(
        address _user,
        uint256[] memory _vaultIds,
        uint256[] memory _amounts,
        LiqRequest memory _liqData
    ) external onlyRole(ROUTER_ROLE) returns (uint256[] memory dstAmounts) {
        uint256 len1 = _liqData.txData.length;
        address receiver = len1 == 0 ? address(_user) : address(this);
        dstAmounts = new uint256[](_vaultIds.length);

        for (uint256 i = 0; i < _vaultIds.length; i++) {
            IERC4626 v = vault[_vaultIds[i]];
            dstAmounts[i] = v.redeem(_amounts[i], receiver, address(this));
        }

        if (len1 != 0) {
            dispatchTokens(
                bridgeAddress[_liqData.bridgeId],
                _liqData.txData,
                _liqData.token,
                _liqData.allowanceTarget,
                _liqData.amount,
                address(this)
            );
        }
    }

    /* ================ Development Only Functions =================== */

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @notice should be removed after end-to-end testing.
     * @dev allows admin to withdraw lost tokens in the smart contract.
     */
    function withdrawToken(address _tokenContract, uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20 tokenContract = IERC20(_tokenContract);

        // transfer the token from address of this contract
        // to address of the user (executing the withdrawToken() function)
        tokenContract.transfer(msg.sender, _amount);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev allows admin to withdraw lost native tokens in the smart contract.
     */
    function withdrawNativeToken(uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        payable(msg.sender).transfer(_amount);
    }

    /* ================ ERC4626 View Functions =================== */

    /**
     * @dev SuperDestination may need to know state of funds deployed to 3rd party Vaults
     * @dev API may need to know state of funds deployed
     */
    function previewDepositTo(uint256 vaultId, uint256 assets)
        public
        view
        returns (uint256)
    {
        return vault[vaultId].convertToShares(assets);
    }

    /**
     * @notice positionBalance() -> .vaultIds&destAmounts
     * @return how much of an asset + interest (accrued) is to withdraw from the Vault
     */
    function previewWithdrawFrom(uint256 vaultId, uint256 assets)
        public
        view
        returns (uint256)
    {
        return vault[vaultId].previewWithdraw(assets);
    }

    /**
     * @notice Returns data for single deposit into this vault from SuperRouter (maps user to its balance accross vaults)
     */
    function positionBalance(uint256 positionId)
        public
        view
        returns (uint256[] memory vaultIds, uint256[] memory destAmounts)
    {
        return (
            dstState[positionId].vaultIds,
            dstState[positionId].amounts /// @dev amount of tokens bridged from source (input to vault.deposit())
        );
    }

    /* ================ Internal Functions =================== */

    /**
     * @dev process valid deposit data and deposit collateral.
     * @dev What if vault.asset() isn't the same as bridged token?
     * @param data     represents state data from router of another chain
     */
    function processDeposit(StateData memory data) internal {
        /// @dev Ordering dependency vaultIds need to match dstAmounts (shadow matched to user)
        uint256[] memory dstAmounts = new uint256[](data.vaultIds.length);
        for (uint256 i = 0; i < data.vaultIds.length; i++) {
            IERC4626 v = vault[data.vaultIds[i]];

            dstAmounts[i] = v.deposit(data.amounts[i], address(this));
            /// @notice dstAmounts is equal to SHARES returned by v(ault)'s deposit while data.amounts is equal to ASSETS (tokens) bridged
            emit Processed(
                data.srcChainId,
                data.dstChainId,
                data.txId,
                data.amounts[i],
                data.vaultIds[i]
            );
        }
        /// Note Step-4: Send Data to Source to issue superform shares.
        stateHandler.dispatchState{value: msg.value}(
            data.srcChainId,
            abi.encode(
                StateData(
                    TransactionType.DEPOSIT,
                    CallbackType.RETURN,
                    data.srcChainId,
                    data.dstChainId,
                    data.user,
                    data.vaultIds,
                    dstAmounts,
                    data.maxSlippage,
                    data.txId,
                    bytes("")
                )
            ),
            safeGasParam
        );
    }

    /**
     * @dev process valid withdrawal data and remove collateral.
     * @param data     represents state data from router of another chain
     */
    function processWithdrawal(StateData memory data) internal {
        uint256[] memory dstAmounts = new uint256[](data.vaultIds.length);
        LiqRequest memory _liqData = abi.decode(data.liqData, (LiqRequest));
        for (uint256 i = 0; i < data.vaultIds.length; i++) {
            if (_liqData.txData.length != 0) {
                IERC4626 v = vault[data.vaultIds[i]];
                /// Note Redeem Vault shares (we operate only on shares, not assets)
                dstAmounts[i] = v.redeem(
                    data.amounts[i],
                    address(this),
                    address(this)
                );

                uint256 balanceBefore = IERC20(v.asset()).balanceOf(
                    address(this)
                );
                /// Note Send Tokens to Source Chain
                /// FEAT Note: We could also allow to pass additional chainId arg here
                /// FEAT Note: Requires multiple ILayerZeroEndpoints to be mapped
                dispatchTokens(
                    bridgeAddress[_liqData.bridgeId],
                    _liqData.txData,
                    _liqData.token,
                    _liqData.allowanceTarget,
                    dstAmounts[i],
                    address(this)
                );
                uint256 balanceAfter = IERC20(v.asset()).balanceOf(
                    address(this)
                );

                /// note: balance validation to prevent draining contract.
                require(
                    balanceAfter >= balanceBefore - dstAmounts[i],
                    "Destination: Invalid Liq Request"
                );
            } else {
                IERC4626 v = vault[data.vaultIds[i]];
                /// Note Redeem Vault shares (we operate only on shares, not assets)
                dstAmounts[i] = v.redeem(
                    data.amounts[i],
                    address(data.user),
                    address(this)
                );
            }

            emit Processed(
                data.srcChainId,
                data.dstChainId,
                data.txId,
                dstAmounts[i],
                data.vaultIds[i]
            );
        }
    }
}
