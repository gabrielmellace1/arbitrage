import express from 'express';
import { config } from '../config.js';
import logger from './logger.js';

export class HealthMonitor {
  constructor(providers, pools) {
    this.app = express();
    this.providers = providers;
    this.pools = pools;
    this.status = {
      healthy: true,
      lastCheck: Date.now(),
      issues: []
    };

    this.setupRoutes();
    this.startMonitoring();
  }

  setupRoutes() {
    this.app.get(config.healthCheck.path, (req, res) => {
      res.json(this.status);
      res.status(this.status.healthy ? 200 : 503);
    });

    this.app.listen(config.healthCheck.port, () => {
      logger.info(`Health monitor listening on port ${config.healthCheck.port}`);
    });
  }

  async checkHealth() {
    try {
      const issues = [];

      // Check RPC connections
      const ethConnection = await this.providers.ethereum.getNetwork();
      const blastConnection = await this.providers.blast.getNetwork();

      if (!ethConnection) issues.push('Ethereum RPC connection failed');
      if (!blastConnection) issues.push('Blast RPC connection failed');

      // Check pool contracts
      const ethReserves = await this.pools.ethPool.getReserves();
      const blastReserves = await this.pools.blastPool.getReserves();

      if (!ethReserves) issues.push('Ethereum pool contract unreachable');
      if (!blastReserves) issues.push('Blast pool contract unreachable');

      this.status = {
        healthy: issues.length === 0,
        lastCheck: Date.now(),
        issues
      };

      logger.info('Health check completed', this.status);
    } catch (error) {
      logger.error('Health check failed', error);
      this.status.healthy = false;
      this.status.issues = ['Health check failed: ' + error.message];
    }
  }

  startMonitoring() {
    setInterval(() => this.checkHealth(), config.healthCheck.interval);
  }
}