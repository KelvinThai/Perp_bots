import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createDriftClient, cleanupClient } from './setup/client';
import { MarketMakerBot } from './bots/market-maker';
import { RandomTraderBot } from './bots/random-trader';
import { SpreadFillerBot } from './bots/spread-filler';
import { DriftClient } from '@drift-labs/sdk';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('bot', {
      type: 'string',
      choices: ['market-maker', 'random-trader', 'spread-filler', 'all'],
      default: 'market-maker',
      describe: 'Which bot(s) to run',
    })
    .option('market', {
      type: 'number',
      default: 0,
      describe: 'Perp market index (0=SOL, 1=BTC, 2=ETH)',
    })
    .help()
    .parse();

  const botType = argv.bot as string;
  const marketIndex = argv.market as number;

  console.log(`Starting bot=${botType} market=${marketIndex}`);

  const { client } = await createDriftClient();

  const bots: Array<{ stop: () => void }> = [];
  const botPromises: Promise<void>[] = [];

  if (botType === 'market-maker' || botType === 'all') {
    const bot = new MarketMakerBot(client, { marketIndex });
    bots.push(bot);
    botPromises.push(bot.start());
  }

  if (botType === 'random-trader' || botType === 'all') {
    const bot = new RandomTraderBot(client, { marketIndex });
    bots.push(bot);
    botPromises.push(bot.start());
  }

  if (botType === 'spread-filler' || botType === 'all') {
    const bot = new SpreadFillerBot(client, { marketIndex });
    bots.push(bot);
    botPromises.push(bot.start());
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down...`);

    // Stop all bots
    for (const bot of bots) {
      bot.stop();
    }

    // Cancel all open orders
    try {
      console.log('Cancelling all open orders...');
      await client.cancelOrders();
      console.log('All orders cancelled');
    } catch (err: any) {
      console.error(`Failed to cancel orders: ${err.message}`);
    }

    // Cleanup
    await cleanupClient(client);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Wait for all bots (they run indefinitely until stopped)
  await Promise.all(botPromises);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
