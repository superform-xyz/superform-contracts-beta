// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract sERC20 is ERC20, AccessControl {
    bytes32 public constant SHARES_SPLITTER_ROLE =
        keccak256("SHARES_SPLITTER_ROLE");

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupRole(SHARES_SPLITTER_ROLE, msg.sender);
    }

    /// @dev Functions could be open (at least burn) and just pass call to SuperRouter
    function mint(address owner, uint256 amount)
        external
        onlyRole(SHARES_SPLITTER_ROLE)
    {
        _mint(owner, amount);
    }

    function burn(address owner, uint256 amount)
        external
        onlyRole(SHARES_SPLITTER_ROLE)
    {
        _burn(owner, amount);
    }
}
