import { ChainProviders } from './providers.js';
import { PoolMonitor } from './pool-monitor.js';
import { ArbitrageExecutor } from './arbitrage.js';
import { config } from './config.js';
import { HealthMonitor } from './services/health-monitor.js';
import logger from './services/logger.js';
import express from 'express';
import { register } from './services/metrics.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let isArbitrageEnabled = false;
let lastPrices = {
  ethereum: null,
  blast: null,
  difference: null,
  timestamp: null
};

async function main() {
  logger.info('Starting arbitrage bot...');

  // Initialize providers
  const providers = new ChainProviders();
  
  // Initialize pool monitors
  const ethPool = new PoolMonitor(
    providers.providers.ethereum,
    config.ethereum.poolAddress,
    'ethereum'
  );
  
  const blastPool = new PoolMonitor(
    providers.providers.blast,
    config.blast.poolAddress,
    'blast'
  );

  // Initialize arbitrage executor
  const arbitrage = new ArbitrageExecutor(providers, ethPool, blastPool);

  // Initialize health monitor
  const healthMonitor = new HealthMonitor(providers, { ethPool, blastPool });

  // Setup express app
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // API endpoints
  app.get('/api/prices', (req, res) => {
    res.json(lastPrices);
  });

  app.get('/api/status', (req, res) => {
    res.json({ isEnabled: isArbitrageEnabled });
  });

  app.post('/api/toggle', (req, res) => {
    isArbitrageEnabled = !isArbitrageEnabled;
    logger.info(`Arbitrage bot ${isArbitrageEnabled ? 'enabled' : 'disabled'}`);
    res.json({ isEnabled: isArbitrageEnabled });
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`Web interface listening on port ${port}`);
  });

  // Price monitoring loop
  const updatePrices = async () => {
    try {
      const [ethPrice, blastPrice] = await Promise.all([
        ethPool.calculatePrice(),
        blastPool.calculatePrice()
      ]);

      if (ethPrice && blastPrice) {
        const priceDiffPercentage = Math.abs((ethPrice - blastPrice) / ethPrice * 100);
        lastPrices = {
          ethereum: ethPrice,
          blast: blastPrice,
          difference: priceDiffPercentage,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      logger.error('Error updating prices:', error);
    }
    setTimeout(updatePrices, 1000);
  };

  // Arbitrage monitoring loop
  const monitorLoop = async () => {
    try {
      if (isArbitrageEnabled) {
        const opportunity = await arbitrage.checkArbitrageProfitability();
        
        if (opportunity?.isProfitable) {
          logger.info('Found profitable opportunity:', opportunity);
          await arbitrage.executeArbitrage(opportunity);
        }
      }
    } catch (error) {
      logger.error('Error in monitoring loop:', error);
    } finally {
      setTimeout(monitorLoop, 1000);
    }
  };

  // Start monitoring loops
  updatePrices();
  monitorLoop();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal. Starting graceful shutdown...');
    process.exit(0);
  });
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});