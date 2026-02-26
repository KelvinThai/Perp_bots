# Perp Bots

Programmatic order placement bots for a custom Drift v2 perpetual DEX on Solana devnet. These bots generate trading activity by placing perp orders on SOL-PERP, BTC-PERP, and ETH-PERP markets.

## Prerequisites

- Node.js
- Yarn
- Local build of `protocol-v2/sdk` (at `../protocol-v2/sdk`)
- A funded Solana devnet keypair with an initialized Drift subaccount

## Setup

```bash
# Install dependencies
yarn install --ignore-engines

# Configure environment
cp .env.example .env
# Edit .env if needed (defaults point to the local devnet program + admin keypair)
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RPC_ENDPOINT` | `https://api.devnet.solana.com` | Solana RPC URL |
| `KEYPAIR_PATH` | `../protocol-v2/keys/admin-keypair.json` | Path to wallet keypair |
| `PROGRAM_ID` | `6prdU12bH7QLTHoNPhA3RF1yzSjrduLQg45JQgCMJ1ko` | Drift program ID |
| `SUB_ACCOUNT_ID` | `1` | Drift subaccount (must exist on-chain) |

## Usage

```bash
# Run a specific bot on a specific market
npx ts-node --transpile-only src/index.ts --bot <bot-name> --market <index>

# Examples
npx ts-node --transpile-only src/index.ts --bot market-maker --market 0   # SOL-PERP
npx ts-node --transpile-only src/index.ts --bot random-trader --market 1  # BTC-PERP
npx ts-node --transpile-only src/index.ts --bot spread-filler --market 2  # ETH-PERP
npx ts-node --transpile-only src/index.ts --bot all --market 0            # All bots on SOL-PERP
```

### Markets

| Index | Market |
|---|---|
| 0 | SOL-PERP |
| 1 | BTC-PERP |
| 2 | ETH-PERP |

## Bots

### Market Maker (`market-maker`)

Places symmetric limit orders around the oracle price in a grid pattern. Refreshes every 10 seconds using `cancelAndPlaceOrders()` for atomic cancel-and-replace.

- 3 bid levels below oracle + 3 ask levels above oracle
- 50 bps (0.5%) spread between levels
- Post-only orders (MUST_POST_ONLY)
- 1 base unit per order

### Random Trader (`random-trader`)

Places random market and limit orders at random intervals to simulate organic trading activity.

- Random direction (long/short)
- Random size (0.01 to 5 base units)
- 50% limit orders / 50% market orders
- Limit orders offset -2% to +2% from oracle
- 15-60 second random interval between orders

### Spread Filler (`spread-filler`)

Monitors the DLOB server for crossed spreads (best bid >= best ask) and places market orders to fill them.

- Queries `http://localhost:6969/l2` every 5 seconds
- Alternates between filling bids and asks
- Requires DLOB server to be running

## Shutdown

Press `Ctrl+C` to gracefully shut down. The bots will cancel all open orders before exiting.

## Project Structure

```
src/
├── index.ts                  # CLI entry point (yargs)
├── setup/
│   ├── config.ts             # Env vars, market indices, SDK precisions
│   ├── client.ts             # DriftClient factory (BulkAccountLoader, 5s polling)
│   └── helpers.ts            # sleep, oracle price, logging
└── bots/
    ├── market-maker.ts       # Symmetric limit order grid
    ├── random-trader.ts      # Random market + limit orders
    └── spread-filler.ts      # Cross-spread filler via DLOB
```
