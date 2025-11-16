/**
 * Map EVM errors to user-friendly messages
 */
export function mapEvmErrorToMessage(error: any): string {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';

  // Common revert messages from the Treasury contract
  const errorMappings: Record<string, string> = {
    'approvalThresholdMustBeLTEPerTxLimit': 'Approval threshold must be less than or equal to the per-transaction limit.',
    'dailyLimitMustBeZeroOrGTEPerTxLimit': 'Daily limit must be zero or greater than/equal to the per-transaction limit.',
    'newBudgetMustCoverAllocations': 'New budget must cover existing spent and reserved amounts.',
    'periodReservedMustBeZero': 'Cannot perform this action while there are pending approved spends.',
    'accountAlreadyClosed': 'This account has already been closed.',
    'accountIsFrozen': 'This account is frozen and cannot be used.',
    'accountIsClosed': 'This account is closed and cannot be used.',
    'chainNotSupported': 'The selected chain is not supported.',
    'chainNotAllowedForAccount': 'The selected chain is not allowed for this account.',
    'amountExceedsPerTxLimit': 'Amount exceeds the per-transaction limit.',
    'amountExceedsDailyLimit': 'Amount exceeds the daily limit.',
    'insufficientBudget': 'Insufficient budget available for this spend.',
    'contractPaused': 'The contract is currently paused.',
    'onlyOwner': 'Only the account owner can perform this action.',
    'onlyApprover': 'Only the account approver can perform this action.',
    'onlyAdmin': 'Only an admin can perform this action.',
    'onlyBackendOperator': 'Only a backend operator can perform this action.',
    'User rejected': 'Transaction was rejected by user.',
    'insufficient funds': 'Insufficient funds to complete this transaction.',
  };

  for (const [key, message] of Object.entries(errorMappings)) {
    if (errorMessage.includes(key)) {
      return message;
    }
  }

  // Check for generic errors
  if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
    return 'Transaction was cancelled.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient gas funds in your wallet.';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error. Please try again.';
  }

  // Default message
  return 'Transaction failed. Please check your input and try again.';
}

/**
 * Extract short error message
 */
export function getShortError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.shortMessage) return error.shortMessage;
  if (error?.message) return error.message.split('\n')[0];
  return 'Unknown error occurred';
}
