import { APP_NAME, APP_URL } from '../config/constants';

/**
 * Build a Sign-In With Ethereum (SIWE) style message
 */
export function buildSiweMessage(address: string, nonce: string): string {
  const domain = typeof window !== 'undefined' ? window.location.host : APP_URL.replace(/https?:\/\//, '');
  const uri = typeof window !== 'undefined' ? window.location.origin : APP_URL;
  const issuedAt = new Date().toISOString();

  return `${APP_NAME} wants you to sign in with your Ethereum account:
${address}

Sign this message to authenticate with ${APP_NAME}.

URI: ${uri}
Version: 1
Chain ID: 5042002
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}
