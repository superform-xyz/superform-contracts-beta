// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../lzApp/NonblockingLzApp.sol";

import {IController} from "../interface/ISource.sol";
import {StateData, CallbackType, PayloadState, TransactionType} from "../types/lzTypes.sol";

/**
 * @title State Handler
 * @author Zeropoint Labs.
 *
 * Contract to handle state transfer between chains using layerzero.
 */
contract StateHandler is NonblockingLzApp, AccessControl {
    /* ================ Constants =================== */
    bytes32 public constant CORE_CONTRACTS_ROLE =
        keccak256("CORE_CONTRACTS_ROLE");
    bytes32 public constant PROCESSOR_CONTRACTS_ROLE =
        keccak256("PROCESSOR_CONTRACTS_ROLE");

    /* ================ State Variables =================== */
    IController public sourceContract;
    IController public destinationContract;
    uint256 public totalPayloads;

    /// @dev maps state received to source_chain, destination_chain and txId
    mapping(uint256 => bytes) public payload;

    /// @dev maps payload to unique id
    mapping(uint256 => PayloadState) public payloadProcessed;

    /* ================ Events =================== */
    event StateReceived(
        uint16 srcChainId,
        uint16 dstChainId,
        uint256 txId,
        uint256 payloadId
    );
    event StateUpdated(uint256 payloadId);
    event StateProcessed(uint256 payloadId);

    /* ================ Constructor =================== */
    /**
     * @param endpoint_ is the layer zero endpoint for respective chain.
     */
    constructor(address endpoint_) NonblockingLzApp(endpoint_) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* ================ External Functions =================== */
    /**
     * @notice receive enables processing native token transfers into the smart contract.
     * @dev socket.tech fails without a native receive function.
     */
    receive() external payable {}

    /**
     * PREVILAGED ADMIN ONLY FUNCTION
     *
     * @dev would update the router and destination contracts to the state handler
     * @param source_           represents the address of super router on respective chain.
     * @param destination_      represents the super destination on respective chain.
     * @dev set source or destination contract as controller
     * @dev StateHandler doesn't care about sameChainId communication (uses directDep/With for that)
     * @dev SuperRouter needs its StateHandler and SuperDestination needs its StateHandler
     * @dev Source's StateHandler IController is SuperRouter, Destination's StateHandler IController is SuperDestination
     */
    function setHandlerController(IController source_, IController destination_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        sourceContract = source_;
        destinationContract = destination_;
    }

    /**
     * PREVILAGED PROCESSOR ONLY FUNCTION
     * @dev updates the state_data value to the exact amounts post bridge and swap slippage.
     */
    function updateState(uint256 payloadId, uint256[] calldata finalAmounts)
        external
        onlyRole(PROCESSOR_CONTRACTS_ROLE)
    {
        require(
            payloadId <= totalPayloads &&
                payloadProcessed[payloadId] == PayloadState.STORED,
            "State Handler: Invalid Payload ID or Status"
        );
        StateData memory data = abi.decode(payload[payloadId], (StateData));
        uint256 l1 = data.amounts.length;
        uint256 l2 = finalAmounts.length;
        require(l1 == l2, "State Handler: Invalid Lengths");

        for (uint256 i = 0; i < l1; i++) {
            uint256 newAmount = finalAmounts[i];
            uint256 maxAmount = data.amounts[i];
            require(newAmount <= maxAmount, "State Handler: Negative Slippage");

            uint256 minAmount = (maxAmount * (10000 - data.maxSlippage[i])) /
                10000;
            require(
                newAmount >= minAmount,
                "State Handler: Slippage Out Of Bounds"
            );
        }

        data.amounts = finalAmounts;
        payload[payloadId] = abi.encode(data);
        payloadProcessed[payloadId] = PayloadState.UPDATED;

        emit StateUpdated(payloadId);
    }

    /**
     * ANYONE CAN INITATE PROCESSING
     *
     * note: update this logic to support no-state-update for withdrawals
     * @dev would execute the received state_messages from super router on source chain.
     * @param payloadId   represents the payload id.
     */
    function processPayload(uint256 payloadId) external payable {
        require(
            payloadId <= totalPayloads,
            "State Handler: Invalid Payload ID"
        );
        bytes memory _payload = payload[payloadId];
        StateData memory data = abi.decode(_payload, (StateData));

        if (data.txType == TransactionType.WITHDRAW) {
            require(
                payloadProcessed[payloadId] == PayloadState.STORED,
                "State Handler: Invalid Payload State"
            );
            destinationContract.stateSync{value: msg.value}(_payload);
        } else {
            if (data.flag == CallbackType.INIT) {
                require(
                    payloadProcessed[payloadId] == PayloadState.UPDATED,
                    "State Handler: Invalid Payload State"
                );
                destinationContract.stateSync{value: msg.value}(_payload);
            } else {
                require(
                    payloadProcessed[payloadId] == PayloadState.STORED,
                    "State Handler: Invalid Payload State"
                );
                sourceContract.stateSync{value: msg.value}(_payload);
            }
        }

        payloadProcessed[payloadId] = PayloadState.PROCESSED;
        emit StateProcessed(payloadId);
    }

    /// @dev allows users to send state to a destination chain contract.
    /// @param dstChainId represents chain id of the destination chain.
    /// @param data represents the state info to be sent.
    /// Note: Add gas calculation to front-end
    /// Note the length of srcAmounts & vaultIds should always be equal.
    function dispatchState(
        uint16 dstChainId,
        bytes memory data,
        bytes memory adapterParam
    ) external payable onlyRole(CORE_CONTRACTS_ROLE) {
        _lzSend(
            dstChainId,
            data,
            payable(_msgSender()),
            address(0x0),
            adapterParam
        );
    }

    /* ================ Internal Functions =================== */
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        totalPayloads++;
        payload[totalPayloads] = _payload;

        StateData memory data = abi.decode(_payload, (StateData));

        emit StateReceived(
            data.srcChainId,
            data.dstChainId,
            data.txId,
            totalPayloads
        );
    }
}
