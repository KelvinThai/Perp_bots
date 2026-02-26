import { PublicKey } from '@solana/web3.js';
import {
  BASE_PRECISION,
  PRICE_PRECISION,
  QUOTE_PRECISION,
} from '@drift-labs/sdk';
import fs from 'fs';
import path from 'path';

// Support both env vars (K8s/Docker) and credentials.json (local dev)
let creds: {
  rpcEndpoint: string;
  keypairPath: string;
  programId: string;
  subAccounts: Record<string, number>;
};

if (process.env.RPC_ENDPOINT && process.env.KEYPAIR_PATH && process.env.PROGRAM_ID) {
  creds = {
    rpcEndpoint: process.env.RPC_ENDPOINT,
    keypairPath: process.env.KEYPAIR_PATH,
    programId: process.env.PROGRAM_ID,
    subAccounts: process.env.SUB_ACCOUNTS
      ? JSON.parse(process.env.SUB_ACCOUNTS)
      : { marketMaker: 1, randomTrader: 2, spreadFiller: 2 },
  };
} else {
  const credPath = path.resolve(__dirname, '../../credentials.json');
  creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
}

export const RPC_ENDPOINT: string = creds.rpcEndpoint;
export const KEYPAIR_PATH: string = creds.keypairPath;
export const PROGRAM_ID = new PublicKey(creds.programId);

export const SUB_ACCOUNTS: Record<string, number> = creds.subAccounts;

// Perp market indices
export const SOL_PERP = 0;
export const BTC_PERP = 1;
export const ETH_PERP = 2;
export const TEAM_PERP = 3;

// Re-export SDK precisions for convenience
export { BASE_PRECISION, PRICE_PRECISION, QUOTE_PRECISION };
