import { ethers } from 'ethers';
import { config } from './config.js';
import logger from './services/logger.js';
import retry from 'async-retry';

export class ChainProviders {
  constructor() {
    this.providers = {
      ethereum: this.createProviderWithFailover(config.ethereum),
      blast: this.createProviderWithFailover(config.blast)
    };

    this.wallet = new ethers.Wallet(config.privateKey);
    this.signers = {
      ethereum: this.wallet.connect(this.providers.ethereum),
      blast: this.wallet.connect(this.providers.blast)
    };
  }

  createProviderWithFailover(chainConfig) {
    const providers = [
      new ethers.JsonRpcProvider(chainConfig.rpcUrl),
      ...chainConfig.backupRpcUrls.map(url => new ethers.JsonRpcProvider(url))
    ];

    return new ethers.FallbackProvider(providers, 1);
  }

  async getGasPrices() {
    return await retry(async () => {
      const [ethGas, blastGas] = await Promise.all([
        this.providers.ethereum.getFeeData(),
        this.providers.blast.getFeeData()
      ]);

      return { ethereum: ethGas, blast: blastGas };
    }, {
      retries: config.retry.attempts,
      minTimeout: config.retry.backoff.min,
      maxTimeout: config.retry.backoff.max,
      factor: config.retry.backoff.factor,
      onRetry: (error) => {
        logger.warn('Retrying gas price fetch after error:', error);
      }
    });
  }

  async isGasPriceAcceptable(chain) {
    const gasData = await this.providers[chain].getFeeData();
    const maxGasPrice = ethers.parseUnits(config[chain].maxGasPrice, 'gwei');
    return gasData.gasPrice <= maxGasPrice;
  }
}