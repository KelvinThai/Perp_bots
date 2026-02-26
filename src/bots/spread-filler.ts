import { BN } from '@coral-xyz/anchor';
import {
  DriftClient,
  PositionDirection,
  getMarketOrderParams,
} from '@drift-labs/sdk';
import { BASE_PRECISION, PRICE_PRECISION } from '../setup/config';
import { sleep, logOrder } from '../setup/helpers';
import http from 'http';

export interface SpreadFillerConfig {
  marketIndex: number;
  checkIntervalMs: number; // default 5000
  fillSizeBase: number;    // size in base units
  dlobUrl: string;         // default http://localhost:6969
  subAccountId: number;    // subaccount to place orders on
}

const DEFAULT_CONFIG: SpreadFillerConfig = {
  marketIndex: 0,
  checkIntervalMs: 5000,
  fillSizeBase: 0.1,
  dlobUrl: 'http://localhost:6969',
  subAccountId: 2,
};

interface L2Response {
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export class SpreadFillerBot {
  private client: DriftClient;
  private config: SpreadFillerConfig;
  private running = false;
  private fillBidNext = true; // alternate between filling bids and asks

  constructor(client: DriftClient, config?: Partial<SpreadFillerConfig>) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(
      `[SpreadFiller] Starting on market ${this.config.marketIndex} | ` +
        `subAccount=${this.config.subAccountId} ` +
        `interval=${this.config.checkIntervalMs}ms ` +
        `fillSize=${this.config.fillSizeBase} ` +
        `dlobUrl=${this.config.dlobUrl}`
    );

    while (this.running) {
      try {
        await this.checkAndFill();
      } catch (err: any) {
        console.error(`[SpreadFiller] Error: ${err.message}`);
      }
      await sleep(this.config.checkIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
    console.log('[SpreadFiller] Stopping...');
  }

  private async checkAndFill(): Promise<void> {
    const { marketIndex, fillSizeBase, dlobUrl } = this.config;

    const l2 = await this.fetchL2(
      `${dlobUrl}/l2?marketIndex=${marketIndex}&marketType=perp`
    );

    if (!l2 || l2.bids.length === 0 || l2.asks.length === 0) {
      return; // no orders on one side
    }

    const bestBid = parseFloat(l2.bids[0].price);
    const bestAsk = parseFloat(l2.asks[0].price);

    if (bestBid < bestAsk) {
      return; // spread is not crossed
    }

    // Spread is crossed — place a market order to take it
    const baseAmount = new BN(
      Math.round(fillSizeBase * BASE_PRECISION.toNumber())
    );

    if (this.fillBidNext) {
      // Sell into the bid
      const txSig = await this.client.placePerpOrder(
        getMarketOrderParams({
          marketIndex,
          direction: PositionDirection.SHORT,
          baseAssetAmount: baseAmount,
        }),
        undefined,
        this.config.subAccountId
      );
      logOrder('SpreadFiller:SELL', 'SHORT', fillSizeBase, bestBid, marketIndex);
      console.log(`[SpreadFiller] tx: ${txSig}`);
    } else {
      // Buy into the ask
      const txSig = await this.client.placePerpOrder(
        getMarketOrderParams({
          marketIndex,
          direction: PositionDirection.LONG,
          baseAssetAmount: baseAmount,
        }),
        undefined,
        this.config.subAccountId
      );
      logOrder('SpreadFiller:BUY', 'LONG', fillSizeBase, bestAsk, marketIndex);
      console.log(`[SpreadFiller] tx: ${txSig}`);
    }

    this.fillBidNext = !this.fillBidNext;
  }

  private fetchL2(url: string): Promise<L2Response | null> {
    return new Promise((resolve) => {
      http
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        })
        .on('error', () => resolve(null));
    });
  }
}
