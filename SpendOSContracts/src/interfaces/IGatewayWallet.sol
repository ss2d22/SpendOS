// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IGatewayWallet
 * @notice Interface for Circle Gateway Wallet contract
 * @dev For reference only - we don't directly interact with this in Treasury
 */
interface IGatewayWallet {
    // Deposit USDC to create unified balance
    function depositFor(address depositor, uint256 amount) external;

    // Initiate withdrawal (requires 7-day delay)
    function initiateWithdrawal(uint256 amount) external;

    // Complete withdrawal after delay
    function completeWithdrawal() external;

    // Events
    event Deposited(
        address indexed depositor,
        address indexed token,
        uint256 amount,
        uint256 balance
    );

    event WithdrawalInitiated(
        address indexed depositor,
        uint256 amount,
        uint256 withdrawalBlock
    );
}
