// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

interface ISharesSplitter {
    function wrapFor(address user, uint256 amount) external;

    function registerWrapper(
        uint256 vaultId,
        string memory name,
        string memory symbol
    ) external;
}
