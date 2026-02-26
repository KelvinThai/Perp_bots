import { DriftClient } from '@drift-labs/sdk';
import { PRICE_PRECISION } from './config';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getOraclePrice(
  client: DriftClient,
  marketIndex: number
): number {
  const oracleData = client.getOracleDataForPerpMarket(marketIndex);
  return oracleData.price.toNumber() / PRICE_PRECISION.toNumber();
}

export function logOrder(
  label: string,
  direction: string,
  size: number,
  price?: number,
  marketIndex?: number
): void {
  const ts = new Date().toISOString();
  const market =
    marketIndex !== undefined ? `market=${marketIndex}` : '';
  const priceStr = price !== undefined ? `price=${price.toFixed(4)}` : '';
  console.log(
    `[${ts}] ${label} | ${direction} size=${size} ${priceStr} ${market}`.trim()
  );
}
