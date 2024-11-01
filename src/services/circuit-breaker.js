export class CircuitBreaker {
  constructor(config) {
    this.maxFailures = config.circuitBreaker.maxFailures;
    this.resetTimeout = config.circuitBreaker.resetTimeout;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED';
  }
}