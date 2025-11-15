// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library ValidationLib {
    error InvalidAddress();
    error InvalidAmount();
    error InvalidString();

    function validateAddress(address addr) internal pure {
        if (addr == address(0)) revert InvalidAddress();
    }

    function validateAmount(uint256 amount, uint256 max) internal pure {
        if (amount == 0 || amount > max) revert InvalidAmount();
    }

    function validateStringLength(string memory str, uint256 maxLength) internal pure {
        if (bytes(str).length == 0 || bytes(str).length > maxLength) {
            revert InvalidString();
        }
    }
}
