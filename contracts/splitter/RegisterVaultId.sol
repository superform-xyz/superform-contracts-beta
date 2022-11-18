// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

import {ISharesSplitter} from "./ISharesSplitter.sol";

/// @title SharesSplitter
/// @dev Implementation of managment logic inside of SuperRouter, causes it to go over contract size limit.
/// @dev Ops like registering external modules should be modularized themselves.
abstract contract RegisterVautlId {
    ISharesSplitter public sharesSplitter;

    function setSpliter(address impl) external {
        sharesSplitter = ISharesSplitter(impl);
    }

    function addWrapper(
        uint256 vaultId,
        string memory name,
        string memory symbol
    ) external {
        /// @dev We should release more control here. Read name and symbol directly from the Vault.
        sharesSplitter.registerWrapper(vaultId, name, symbol);
    }
}
