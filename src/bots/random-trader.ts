import { BN } from '@coral-xyz/anchor';
import {
  DriftClient,
  PositionDirection,
  getLimitOrderParams,
  getMarketOrderParams,
} from '@drift-labs/sdk';
import { BASE_PRECISION, PRICE_PRECISION } from '../setup/config';
import { sleep, getOraclePrice, logOrder } from '../setup/helpers';

export interface RandomTraderConfig {
  marketIndex: number;
  minIntervalMs: number;  // default 15000
  maxIntervalMs: number;  // default 60000
  maxSizeBase: number;    // max order size in base units (e.g. 5 SOL)
  minSizeBase: number;    // min order size in base units (e.g. 0.01 SOL)
  limitOrderPct: number;  // probability of limit vs market (0.5 = 50%)
}

const DEFAULT_CONFIG: RandomTraderConfig = {
  marketIndex: 0,
  minIntervalMs: 15000,
  maxIntervalMs: 60000,
  maxSizeBase: 5,
  minSizeBase: 0.01,
  limitOrderPct: 0.5,
};

export class RandomTraderBot {
  private client: DriftClient;
  private config: RandomTraderConfig;
  private running = false;

  constructor(client: DriftClient, config?: Partial<RandomTraderConfig>) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(
      `[RandomTrader] Starting on market ${this.config.marketIndex} | ` +
        `interval=${this.config.minIntervalMs}-${this.config.maxIntervalMs}ms ` +
        `size=${this.config.minSizeBase}-${this.config.maxSizeBase} ` +
        `limitPct=${this.config.limitOrderPct}`
    );

    while (this.running) {
      try {
        await this.placeRandomOrder();
      } catch (err: any) {
        console.error(`[RandomTrader] Error: ${err.message}`);
      }
      const interval = this.randomBetween(
        this.config.minIntervalMs,
        this.config.maxIntervalMs
      );
      await sleep(interval);
    }
  }

  stop(): void {
    this.running = false;
    console.log('[RandomTrader] Stopping...');
  }

  private async placeRandomOrder(): Promise<void> {
    const { marketIndex, minSizeBase, maxSizeBase, limitOrderPct } =
      this.config;

    const oraclePrice = getOraclePrice(this.client, marketIndex);
    if (oraclePrice <= 0) {
      console.warn('[RandomTrader] Invalid oracle price, skipping');
      return;
    }

    // Random direction
    const isLong = Math.random() > 0.5;
    const direction = isLong
      ? PositionDirection.LONG
      : PositionDirection.SHORT;
    const dirLabel = isLong ? 'LONG' : 'SHORT';

    // Random size (quantized to 0.01)
    const rawSize = this.randomBetween(minSizeBase, maxSizeBase);
    const size = Math.round(rawSize * 100) / 100;
    const baseAmount = new BN(Math.round(size * BASE_PRECISION.toNumber()));

    // Random order type
    const isLimit = Math.random() < limitOrderPct;

    if (isLimit) {
      // Random price offset: -2% to +2% from oracle
      const offsetPct = (Math.random() * 4 - 2) / 100; // -0.02 to +0.02
      const price = oraclePrice * (1 + offsetPct);
      const priceBN = new BN(Math.round(price * PRICE_PRECISION.toNumber()));

      const txSig = await this.client.placePerpOrder(
        getLimitOrderParams({
          marketIndex,
          direction,
          baseAssetAmount: baseAmount,
          price: priceBN,
        })
      );

      logOrder('RandomTrader:LIMIT', dirLabel, size, price, marketIndex);
      console.log(`[RandomTrader] tx: ${txSig}`);
    } else {
      const txSig = await this.client.placePerpOrder(
        getMarketOrderParams({
          marketIndex,
          direction,
          baseAssetAmount: baseAmount,
        })
      );

      logOrder('RandomTrader:MARKET', dirLabel, size, oraclePrice, marketIndex);
      console.log(`[RandomTrader] tx: ${txSig}`);
    }
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
