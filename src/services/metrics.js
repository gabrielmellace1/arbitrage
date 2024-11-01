import client from 'prom-client';

const register = new client.Registry();

// Metrics
export const profitabilityGauge = new client.Gauge({
  name: 'arbitrage_profitability',
  help: 'Current profitability percentage between chains'
});

export const successfulTradesCounter = new client.Counter({
  name: 'successful_trades_total',
  help: 'Total number of successful arbitrage trades'
});

export const failedTradesCounter = new client.Counter({
  name: 'failed_trades_total',
  help: 'Total number of failed arbitrage trades'
});

export const gasPrice = new client.Gauge({
  name: 'gas_price',
  help: 'Current gas price in gwei',
  labelNames: ['chain']
});

register.setDefaultLabels({
  app: 'arbitrage-bot'
});

register.registerMetric(profitabilityGauge);
register.registerMetric(successfulTradesCounter);
register.registerMetric(failedTradesCounter);
register.registerMetric(gasPrice);

export { register };