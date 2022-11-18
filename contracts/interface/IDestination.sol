// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.14;

import {LiqRequest} from "../types/socketTypes.sol";

interface IDestination {
    function directDeposit(
        address user,
        uint256[] memory vaultIds,
        uint256[] memory amounts
    ) external returns (uint256[] memory dstAmounts);

    function directWithdraw(
        address user,
        uint256[] memory vaultIds,
        uint256[] memory amounts,
        LiqRequest memory _liqData
    ) external;

    function stateSync(bytes memory _payload) external payable;
}
