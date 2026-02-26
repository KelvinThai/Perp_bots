import { PublicKey } from '@solana/web3.js';
import {
  BASE_PRECISION,
  PRICE_PRECISION,
  QUOTE_PRECISION,
} from '@drift-labs/sdk';
import fs from 'fs';
import path from 'path';

const credPath = path.resolve(__dirname, '../../credentials.json');
const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

export const RPC_ENDPOINT: string = creds.rpcEndpoint;
export const KEYPAIR_PATH: string = creds.keypairPath;
export const PROGRAM_ID = new PublicKey(creds.programId);

export const SUB_ACCOUNTS: Record<string, number> = creds.subAccounts;

// Perp market indices
export const SOL_PERP = 0;
export const BTC_PERP = 1;
export const ETH_PERP = 2;

// Re-export SDK precisions for convenience
export { BASE_PRECISION, PRICE_PRECISION, QUOTE_PRECISION };
