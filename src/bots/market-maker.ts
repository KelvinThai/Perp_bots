import { BN } from '@coral-xyz/anchor';
import {
  DriftClient,
  PositionDirection,
  PostOnlyParams,
  MarketType,
  getLimitOrderParams,
  getOrderParams,
} from '@drift-labs/sdk';
import { BASE_PRECISION, PRICE_PRECISION } from '../setup/config';
import { sleep, getOraclePrice, logOrder } from '../setup/helpers';

export interface MarketMakerConfig {
  marketIndex: number;
  spreadBps: number;      // default 50 = 0.5%
  orderSizeBase: number;  // size in base units (e.g. 1 = 1 SOL)
  refreshIntervalMs: number; // default 10000
  numLevels: number;      // default 3
}

const DEFAULT_CONFIG: MarketMakerConfig = {
  marketIndex: 0,
  spreadBps: 50,
  orderSizeBase: 1,
  refreshIntervalMs: 10000,
  numLevels: 3,
};

export class MarketMakerBot {
  private client: DriftClient;
  private config: MarketMakerConfig;
  private running = false;

  constructor(client: DriftClient, config?: Partial<MarketMakerConfig>) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(
      `[MarketMaker] Starting on market ${this.config.marketIndex} | ` +
        `spread=${this.config.spreadBps}bps levels=${this.config.numLevels} ` +
        `size=${this.config.orderSizeBase} refresh=${this.config.refreshIntervalMs}ms`
    );

    while (this.running) {
      try {
        await this.placeOrders();
      } catch (err: any) {
        console.error(`[MarketMaker] Error: ${err.message}`);
      }
      await sleep(this.config.refreshIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
    console.log('[MarketMaker] Stopping...');
  }

  private async placeOrders(): Promise<void> {
    const { marketIndex, spreadBps, orderSizeBase, numLevels } = this.config;

    const oraclePrice = getOraclePrice(this.client, marketIndex);
    if (oraclePrice <= 0) {
      console.warn('[MarketMaker] Invalid oracle price, skipping');
      return;
    }

    const baseAmount = new BN(orderSizeBase).mul(BASE_PRECISION);
    const spreadFraction = spreadBps / 10000;

    // Build order params for all levels
    const orderParams = [];

    for (let level = 1; level <= numLevels; level++) {
      const offset = spreadFraction * level;

      // Bid: below oracle
      const bidPrice = oraclePrice * (1 - offset);
      const bidPriceBN = new BN(Math.round(bidPrice * PRICE_PRECISION.toNumber()));

      orderParams.push(
        getOrderParams(
          getLimitOrderParams({
            marketIndex,
            direction: PositionDirection.LONG,
            baseAssetAmount: baseAmount,
            price: bidPriceBN,
            postOnly: PostOnlyParams.MUST_POST_ONLY,
          })
        )
      );

      // Ask: above oracle
      const askPrice = oraclePrice * (1 + offset);
      const askPriceBN = new BN(Math.round(askPrice * PRICE_PRECISION.toNumber()));

      orderParams.push(
        getOrderParams(
          getLimitOrderParams({
            marketIndex,
            direction: PositionDirection.SHORT,
            baseAssetAmount: baseAmount,
            price: askPriceBN,
            postOnly: PostOnlyParams.MUST_POST_ONLY,
          })
        )
      );
    }

    // Cancel all existing perp orders for this market + place new ones atomically
    const txSig = await this.client.cancelAndPlaceOrders(
      {
        marketType: MarketType.PERP,
        marketIndex,
      },
      orderParams
    );

    logOrder(
      'MarketMaker',
      `${numLevels} levels placed`,
      orderSizeBase,
      oraclePrice,
      marketIndex
    );
    console.log(`[MarketMaker] tx: ${txSig}`);
  }
}
