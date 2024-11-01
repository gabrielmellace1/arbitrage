import { ethers } from 'ethers';
import { config } from './config.js';
import logger from './services/logger.js';
import { CircuitBreaker } from './services/circuit-breaker.js';
import { WebSocket } from 'ws';

const POOL_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)'
];

export class PoolMonitor {
  constructor(provider, poolAddress, chain) {
    this.provider = provider;
    this.pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    this.chain = chain;
    this.circuitBreaker = new CircuitBreaker(config);
    this.lastUpdate = null;
    this.setupWebSocket();
  }

  setupWebSocket() {
    const wsProvider = new WebSocket(this.provider.connection.url.replace('http', 'ws'));
    
    wsProvider.on('open', () => {
      logger.info(`WebSocket connected for ${this.chain}`);
      this.subscribeToEvents();
    });

    wsProvider.on('close', () => {
      logger.warn(`WebSocket disconnected for ${this.chain}`);
      setTimeout(() => this.setupWebSocket(), config.websocket.reconnectInterval);
    });
  }

  subscribeToEvents() {
    this.pool.on('Swap', (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
      logger.info('Swap event detected', {
        chain: this.chain,
        sender,
        amount0In: ethers.formatEther(amount0In),
        amount1In: ethers.formatEther(amount1In),
        amount0Out: ethers.formatEther(amount0Out),
        amount1Out: ethers.formatEther(amount1Out),
        to
      });
      this.lastUpdate = Date.now();
    });
  }

  async getReserves() {
    return await this.circuitBreaker.execute(async () => {
      try {
        const { reserve0, reserve1 } = await this.pool.getReserves();
        return { reserve0, reserve1 };
      } catch (error) {
        logger.error('Error fetching reserves:', error);
        return null;
      }
    });
  }

  async calculatePrice() {
    const reserves = await this.getReserves();
    if (!reserves) return null;
    
    const price = ethers.formatEther(reserves.reserve1) / ethers.formatEther(reserves.reserve0);
    
    if (isNaN(price) || !isFinite(price)) {
      logger.error('Invalid price calculated', { reserves, price });
      return null;
    }
    
    return price;
  }
}