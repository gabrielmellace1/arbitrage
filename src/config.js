import dotenv from 'dotenv';
import { validateConfig } from './utils/validation.js';

dotenv.config();

export const config = {
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL,
    poolAddress: process.env.ETH_POOL_ADDRESS,
    backupRpcUrls: (process.env.ETH_BACKUP_RPCS || '').split(',').filter(Boolean),
    maxGasPrice: process.env.ETH_MAX_GAS_PRICE || '100', // in gwei
    confirmations: 2
  },
  blast: {
    rpcUrl: process.env.BLAST_RPC_URL,
    poolAddress: process.env.BLAST_POOL_ADDRESS,
    backupRpcUrls: (process.env.BLAST_BACKUP_RPCS || '').split(',').filter(Boolean),
    maxGasPrice: process.env.BLAST_MAX_GAS_PRICE || '50',
    confirmations: 2
  },
  privateKey: process.env.PRIVATE_KEY,
  minProfitThreshold: process.env.MIN_PROFIT_THRESHOLD || '0.5',
  maxPositionSize: process.env.MAX_POSITION_SIZE || '1.0', // in ETH
  gasLimit: parseInt(process.env.GAS_LIMIT || '300000'),
  slippageTolerance: process.env.SLIPPAGE_TOLERANCE || '1.0',
  
  // Health monitoring
  healthCheck: {
    port: parseInt(process.env.HEALTH_PORT || '3000'),
    path: '/health',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
  },

  // Rate limiting
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000')
  },

  // Circuit breaker
  circuitBreaker: {
    maxFailures: parseInt(process.env.MAX_FAILURES || '3'),
    resetTimeout: parseInt(process.env.RESET_TIMEOUT || '300000')
  },

  // Retry configuration
  retry: {
    attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    backoff: {
      min: 1000,
      max: 10000,
      factor: 2
    }
  },

  // Monitoring
  metrics: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090')
  },

  // WebSocket configuration
  websocket: {
    reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '5000'),
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT || '10')
  }
};

// Validate configuration
validateConfig(config);