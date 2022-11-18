/**
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LiqRequest} from "./types/socketTypes.sol";
import {StateReq, StateData, TransactionType, StateData, CallbackType} from "./types/lzTypes.sol";

import {IStateHandler} from "./interface/layerzero/IStateHandler.sol";
import {IDestination} from "./interface/IDestination.sol";

import "./socket/liquidityHandler.sol";

/**
 * @title Super Router
 * @author Zeropoint Labs.
 *
 * Routes users funds and deposit information to a remote execution chain.
 * extends ERC1155 and Socket's Liquidity Handler.
 * @notice access controlled was removed due to contract sizing issues.
 */
contract SuperRouter is ERC1155, LiquidityHandler {
    /* ================ State Variables =================== */

    /**
     * @notice state = information about destination chain & vault id.
     * @notice  stateHandler accepts requests from whitelisted addresses.
     * @dev stateHandler integrates with interblockchain messaging protocols.
     */
    IStateHandler public stateHandler;

    /**
     * @notice chainId represents layerzero's unique chain id for each chains.
     * @notice admin handles critical state updates.
     * @dev totalTransactions keeps track of overall routed transactions.
     */
    uint16 public chainId;
    uint256 public totalTransactions;
    address public admin;

    /**
     * @notice same chain deposits are processed in one atomic transaction flow.
     * @dev allows to store same chain destination contract addresses.
     */
    IDestination public immutable srcSuperDestination;

    /**
     * @notice chain ids in the destination chain are mapped.
     * @dev maps the token id to a chain id of the vault.
     */
    mapping(uint256 => uint16) public tokenChainId;

    /**
     * @notice history of state sent across chains are used for debugging.
     * @dev maps all transaction data routed through the smart contract.
     */
    mapping(uint256 => StateData) public txHistory;

    /**
     * @notice bridge id is mapped to its execution address.
     * @dev maps all the bridges to their address.
     */
    mapping(uint8 => address) public bridgeAddress;

    /* ================ Events =================== */

    event Initiated(uint256 txId, address fromToken, uint256 fromAmount);
    event Completed(uint256 txId);

    event SetTokenChainId(uint256 vauldId, uint256 chainId);
    event SetBridgeAddress(uint256 bridgeId, address bridgeAddress);

    /* ================ Modifiers =================== */

    /**
     * @dev throw if the sender is not the admin of the contract.
     */
    modifier isAdmin() {
        require(_msgSender() == admin, "Router: Invalid Previlaged Sender");
        _;
    }

    /* ================ Constructor =================== */

    /**
     * @notice deploy stateHandler and SuperDestination before SuperRouter
     *
     * @param chainId_              Layerzero chain id
     * @param baseUri_              URL for external metadata of ERC1155 supershares
     * @param stateHandler_         State handler address deployed
     * @param srcSuperDestination_  Destination address deployed on same chain
     */
    constructor(
        uint16 chainId_,
        string memory baseUri_,
        IStateHandler stateHandler_,
        IDestination srcSuperDestination_
    ) ERC1155(baseUri_) {
        srcSuperDestination = srcSuperDestination_;
        stateHandler = stateHandler_;
        chainId = chainId_;
        admin = _msgSender();
    }

    /* ================ External Functions =================== */
    /**
     * @notice receive enables processing native token transfers into the smart contract.
     * @dev socket.tech fails without a native receive function.
     */
    receive() external payable {}

    /* ================ Write Functions =================== */

    /**
     * @dev allows users to mint vault tokens and receive vault shares in return.
     *
     * @param _liqData      represents the data required to move tokens from user wallet to destination contract.
     * @param _stateData    represents the state information including destination vault ids and amounts to be deposited to such vaults.
     *
     * ENG NOTE: Just use single type not arr and delegate to SuperFormRouter?
     */
    function deposit(
        LiqRequest[] calldata _liqData,
        StateReq[] calldata _stateData
    ) external payable {
        address srcSender = _msgSender();
        uint256 l1 = _liqData.length;
        uint256 l2 = _stateData.length;
        require(l1 == l2, "Router: Input Data Length Mismatch"); ///@dev ENG NOTE: but we may want to split single token deposit to multiple vaults on dst! this block it
        if (l1 > 1) {
            for (uint256 i = 0; i < _liqData.length; i++) {
                singleDeposit(_liqData[i], _stateData[i], srcSender);
            }
        } else {
            singleDeposit(_liqData[0], _stateData[0], srcSender);
        }
    }

    /**
     * @dev burns users supershares and dispatch a withdrawal request to the destination chain.
      
     * @param _stateReq       represents the state data required for withdrawal of funds from the vaults.
     * @param _liqReq         represents the bridge data for underlying to be moved from destination chain.

     * @dev API NOTE: This function can be called by anybody
     * @dev ENG NOTE: Amounts is abstracted. 1:1 of shares on DESTINATION, but user can't query ie. previewWithdraw() cross-chain
     */
    function withdraw(
        StateReq[] calldata _stateReq,
        LiqRequest[] calldata _liqReq /// @dev Allow [] because user can request multiple tokens (as long as bridge has them - Needs check!)
    ) external payable {
        address sender = _msgSender();
        uint256 l1 = _stateReq.length;
        uint256 l2 = _liqReq.length;

        require(l1 == l2, "Router: Invalid Input Length");
        if (l1 > 0) {
            for (uint256 i = 0; i < _liqReq.length; i++) {
                singleWithdrawal(_liqReq[i], _stateReq[i], sender);
            }
        } else {
            singleWithdrawal(_liqReq[0], _stateReq[0], sender);
        }
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev allows admin to set the chain of token id.
     * @param _vaultId  represents the id of the ERC1155 token.
     * @param _chainId  represents the chain id of destination according to layer zero.
     */
    function setTokenChainId(uint256 _vaultId, uint16 _chainId)
        external
        isAdmin
    {
        require(_vaultId != 0 && _chainId != 0, "Router: Invalid data");
        require(
            tokenChainId[_vaultId] == 0,
            "Router: Token Chain Id Already Set"
        );

        tokenChainId[_vaultId] = _chainId;
        emit SetTokenChainId(_vaultId, _chainId);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev allows admin to set the bridge address for an bridge id.
     * @param _bridgeId         represents the bridge unqiue identifier.
     * @param _bridgeAddress    represents the bridge address.
     */
    function setBridgeAddress(uint8 _bridgeId, address _bridgeAddress)
        external
        isAdmin
    {
        require(_bridgeAddress != address(0), "Router: Zero Bridge Address");

        bridgeAddress[_bridgeId] = _bridgeAddress;
        emit SetBridgeAddress(_bridgeId, _bridgeAddress);
    }

    /* ================ Development Only Functions =================== */

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @notice should be removed after end-to-end testing.
     * @dev allows admin to withdraw lost tokens in the smart contract.
     */
    function withdrawToken(address _tokenContract, uint256 _amount)
        external
        isAdmin
    {
        IERC20 tokenContract = IERC20(_tokenContract);

        // transfer the token from address of this contract
        // to address of the user (executing the withdrawToken() function)
        tokenContract.transfer(admin, _amount);
    }

    /**
     * PREVILAGED admin ONLY FUNCTION.
     * @dev allows admin to withdraw lost native tokens in the smart contract.
     */
    function withdrawNativeToken(uint256 _amount) external isAdmin {
        payable(admin).transfer(_amount);
    }

    /**
     * ANYONE CAN CALL THE FUNCTION.
     *
     * @dev processes state channel messages from destination chain post successful deposit to a vault.
     * @param _payload  represents internal transactionId associated with every deposit/withdrawal transaction.
     */
    function stateSync(bytes memory _payload) external payable {
        require(msg.sender == address(stateHandler), "Router: Request Denied");

        StateData memory data = abi.decode(_payload, (StateData));
        _mintBatch(data.user, data.vaultIds, data.amounts, "");

        emit Completed(data.txId);
    }

    /* ================ Internal Functions =================== */

    /**
     * @notice validates input and call state handler & liquidity handler to move
     * tokens and state messages to the destination chain.
     */
    function singleDeposit(
        LiqRequest calldata _liqData,
        StateReq calldata _stateData,
        address srcSender
    ) internal {
        totalTransactions++;
        uint16 dstChainId = _stateData.dstChainId;

        require(
            validateSlippage(_stateData.maxSlippage),
            "Super Router: Invalid Slippage"
        );

        StateData memory info = StateData(
            TransactionType.DEPOSIT,
            CallbackType.INIT,
            chainId,
            dstChainId,
            srcSender,
            _stateData.vaultIds,
            _stateData.amounts,
            _stateData.maxSlippage,
            totalTransactions,
            bytes("")
        );

        txHistory[totalTransactions] = info;

        if (chainId == dstChainId) {
            dstDeposit(_liqData, _stateData, srcSender, totalTransactions);
        } else {
            dispatchTokens(
                bridgeAddress[_liqData.bridgeId],
                _liqData.txData,
                _liqData.token,
                _liqData.allowanceTarget,
                _liqData.amount,
                srcSender
            );

            /// @dev LayerZero endpoint
            stateHandler.dispatchState{value: _stateData.msgValue}(
                dstChainId,
                abi.encode(info),
                _stateData.adapterParam
            );
        }

        emit Initiated(totalTransactions, _liqData.token, _liqData.amount);
    }

    /**
     * @notice validates input and initiates withdrawal process
     */
    function singleWithdrawal(
        LiqRequest calldata _liqData,
        StateReq calldata _stateData,
        address sender
    ) internal {
        uint16 dstChainId = _stateData.dstChainId;

        require(dstChainId != 0, "Router: Invalid Destination Chain");
        _burnBatch(sender, _stateData.vaultIds, _stateData.amounts);

        totalTransactions++;

        StateData memory info = StateData(
            TransactionType.WITHDRAW,
            CallbackType.INIT,
            chainId,
            _stateData.dstChainId,
            sender,
            _stateData.vaultIds,
            _stateData.amounts,
            _stateData.maxSlippage,
            totalTransactions,
            abi.encode(_liqData)
        );

        txHistory[totalTransactions] = info;

        LiqRequest memory data = _liqData;

        if (chainId == dstChainId) {
            /// @dev srcSuperDestination can only transfer tokens back to this SuperRouter
            /// @dev to allow bridging somewhere else requires arch change
            srcSuperDestination.directWithdraw(
                sender,
                _stateData.vaultIds,
                _stateData.amounts,
                data
            );

            emit Completed(totalTransactions);
        } else {
            /// @dev _liqReq should have path encoded for withdraw to SuperRouter on chain different than chainId
            /// @dev construct txData in this fashion: from FTM SOURCE send message to BSC DESTINATION
            /// @dev so that BSC DISPATCHTOKENS sends tokens to AVAX receiver (EOA/contract/user-specified)
            /// @dev sync could be a problem, how long Socket path stays vaild vs. how fast we bridge/receive on Dst
            stateHandler.dispatchState{value: _stateData.msgValue}(
                dstChainId,
                abi.encode(info),
                _stateData.adapterParam
            );
        }

        emit Initiated(totalTransactions, _liqData.token, _liqData.amount);
    }

    /**
     * @notice deposit() to vaults existing on the same chain as SuperRouter
     * @dev Optimistic transfer & call
     */
    function dstDeposit(
        LiqRequest calldata _liqData,
        StateReq calldata _stateData,
        address srcSender,
        uint256 txId
    ) internal {
        /// @dev sends the user tokens to sameIdSuperDestination for deposit()
        if (_liqData.txData.length == 0) {
            require(
                IERC20(_liqData.token).allowance(srcSender, address(this)) >=
                    _liqData.amount,
                "Router: Insufficient Allowance"
            );
            IERC20(_liqData.token).transferFrom(
                srcSender,
                address(srcSuperDestination),
                _liqData.amount
            );
        } else {
            dispatchTokens(
                bridgeAddress[_liqData.bridgeId],
                _liqData.txData,
                _liqData.token,
                _liqData.allowanceTarget,
                _liqData.amount,
                srcSender
            );
        }

        /// @dev deposits collateral to a given vault and mint vault shares.
        uint256[] memory dstAmounts = srcSuperDestination.directDeposit(
            srcSender,
            _stateData.vaultIds,
            _stateData.amounts
        );

        /// @dev TEST-CASE: _msgSender() to whom we mint. use passed `admin` arg?
        _mintBatch(srcSender, _stateData.vaultIds, dstAmounts, "");

        emit Completed(txId);
    }

    /**
     * @dev validates slippage parameter;
     * slippages should always be within 0 - 100
     * decimal is handles in the form of 10s
     * for eg. 0.05 = 5
     *         100 = 10000
     */
    function validateSlippage(uint256[] calldata slippages)
        internal
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < slippages.length; i++) {
            if (slippages[i] < 0 || slippages[i] > 10000) {
                return false;
            }
        }
        return true;
    }
}

//silver panic six despair rack share fresh bar element rather frost gaze
