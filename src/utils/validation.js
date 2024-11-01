export function validateConfig(config) {
  const required = [
    'ethereum.rpcUrl',
    'ethereum.poolAddress',
    'blast.rpcUrl',
    'blast.poolAddress',
    'privateKey'
  ];

  for (const path of required) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
      throw new Error(`Missing required config: ${path}`);
    }
  }

  // Validate numeric values
  if (parseFloat(config.minProfitThreshold) <= 0) {
    throw new Error('minProfitThreshold must be positive');
  }

  if (parseFloat(config.maxPositionSize) <= 0) {
    throw new Error('maxPositionSize must be positive');
  }

  // Validate addresses
  if (!config.ethereum.poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid Ethereum pool address');
  }

  if (!config.blast.poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid Blast pool address');
  }
}