import { Connection, Keypair } from '@solana/web3.js';
import {
  DriftClient,
  Wallet,
  BulkAccountLoader,
  getMarketsAndOraclesForSubscription,
} from '@drift-labs/sdk';
import { RPC_ENDPOINT, KEYPAIR_PATH, PROGRAM_ID, SUB_ACCOUNT_ID } from './config';
import fs from 'fs';
import path from 'path';

export async function createDriftClient(): Promise<{
  client: DriftClient;
  connection: Connection;
  wallet: Wallet;
}> {
  // Load keypair
  const keypairPath = path.resolve(KEYPAIR_PATH);
  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  );
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new Wallet(keypair);

  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`SubAccount: ${SUB_ACCOUNT_ID}`);

  // Create connection
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
  });

  // BulkAccountLoader for polling
  const bulkAccountLoader = new BulkAccountLoader(
    connection,
    'confirmed',
    5000
  );

  // Get market + oracle subscription configs
  // Note: spotMarketIndexes needed for USDC quote asset oracle resolution
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } =
    getMarketsAndOraclesForSubscription('devnet');

  // Init DriftClient
  const client = new DriftClient({
    connection,
    wallet,
    programID: PROGRAM_ID,
    env: 'devnet',
    accountSubscription: {
      type: 'polling',
      accountLoader: bulkAccountLoader,
    },
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
    activeSubAccountId: SUB_ACCOUNT_ID,
    subAccountIds: [SUB_ACCOUNT_ID],
    txVersion: 0 as 0,
  });

  // Subscribe with retries
  let retries = 0;
  while (!(await client.subscribe())) {
    retries++;
    if (retries > 10) {
      throw new Error('Failed to subscribe DriftClient after 10 retries');
    }
    console.log(`Retrying driftClient.subscribe... (${retries})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('DriftClient subscribed. Waiting for first poll cycle...');
  await new Promise((r) => setTimeout(r, 6000));
  console.log('DriftClient ready');

  return { client, connection, wallet };
}

export async function cleanupClient(client: DriftClient): Promise<void> {
  await client.unsubscribe();
  console.log('DriftClient unsubscribed');
}
