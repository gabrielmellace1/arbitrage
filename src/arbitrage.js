import { ethers } from 'ethers';
import { config } from './config.js';
import logger from './services/logger.js';
import { checkRateLimit } from './services/rate-limiter.js';
import { CircuitBreaker } from './services/circuit-breaker.js';
import { profitabilityGauge, successfulTradesCounter, failedTradesCounter } from './services/metrics.js';
import PQueue from 'p-queue';

export class ArbitrageExecutor {
  constructor(providers, ethPool, blastPool) {
    this.providers = providers;
    this.ethPool = ethPool;
    this.blastPool = blastPool;
    this.circuitBreaker = new CircuitBreaker(config);
    this.executionQueue = new PQueue({ concurrency: 1 });
    this.lastExecutionTime = null;
    this.minExecutionInterval = 5000; // 5 seconds between trades
  }

  async checkArbitrageProfitability() {
    if (!(await checkRateLimit())) {
      return null;
    }

    const [ethPrice, blastPrice] = await Promise.all([
      this.ethPool.calculatePrice(),
      this.blastPool.calculatePrice()
    ]);

    if (!ethPrice || !blastPrice) return null;

    const priceDiffPercentage = Math.abs((ethPrice - blastPrice) / ethPrice * 100);
    const isProfitable = priceDiffPercentage > parseFloat(config.minProfitThreshold);

    // Update metrics
    profitabilityGauge.set(priceDiffPercentage);

    // Check gas prices
    const [ethGasOk, blastGasOk] = await Promise.all([
      this.providers.isGasPriceAcceptable('ethereum'),
      this.providers.isGasPriceAcceptable('blast')
    ]);

    if (!ethGasOk || !blastGasOk) {
      logger.warn('Gas price too high, skipping opportunity');
      return null;
    }

    return {
      ethPrice,
      blastPrice,
      priceDiffPercentage,
      isProfitable,
      direction: ethPrice > blastPrice ? 'ETH_TO_BLAST' : 'BLAST_TO_ETH',
      timestamp: Date.now()
    };
  }

  async executeArbitrage(opportunity) {
    // Rate limiting check
    if (
      this.lastExecutionTime &&
      Date.now() - this.lastExecutionTime < this.minExecutionInterval
    ) {
      logger.info('Skipping execution due to rate limiting');
      return;
    }

    return this.executionQueue.add(async () => {
      try {
        await this.circuitBreaker.execute(async () => {
          logger.info('Executing arbitrage opportunity', opportunity);

          // Simulate the trade first
          const simulation = await this.simulateTrade(opportunity);
          if (!simulation.profitable) {
            logger.warn('Trade simulation showed unprofitable result', simulation);
            return;
          }

          // Execute the trade
          const tx = await this.executeTrade(opportunity);
          
          // Wait for confirmations
          await tx.wait(config.ethereum.confirmations);

          this.lastExecutionTime = Date.now();
          successfulTradesCounter.inc();
          
          logger.info('Trade executed successfully', {
            txHash: tx.hash,
            gasUsed: tx.gasUsed?.toString(),
            effectiveGasPrice: tx.effectiveGasPrice?.toString()
          });
        });
      } catch (error) {
        failedTradesCounter.inc();
        logger.error('Trade execution failed', error);
        throw error;
      }
    });
  }

  async simulateTrade(opportunity) {
    // Implement trade simulation logic
    return { profitable: true }; // Placeholder
  }

  async executeTrade(opportunity) {
    // Implement actual trade execution
    return { hash: '0x...', gasUsed: 0, effectiveGasPrice: 0 }; // Placeholder
  }
}