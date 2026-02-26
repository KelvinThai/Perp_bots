import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import {
  BASE_PRECISION,
  PRICE_PRECISION,
  QUOTE_PRECISION,
} from '@drift-labs/sdk';

dotenv.config();

export const RPC_ENDPOINT =
  process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
export const KEYPAIR_PATH =
  process.env.KEYPAIR_PATH || '../protocol-v2/keys/admin-keypair.json';
export const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '6prdU12bH7QLTHoNPhA3RF1yzSjrduLQg45JQgCMJ1ko'
);
export const SUB_ACCOUNT_ID = parseInt(process.env.SUB_ACCOUNT_ID || '1', 10);

// Perp market indices
export const SOL_PERP = 0;
export const BTC_PERP = 1;
export const ETH_PERP = 2;

// Re-export SDK precisions for convenience
export { BASE_PRECISION, PRICE_PRECISION, QUOTE_PRECISION };
