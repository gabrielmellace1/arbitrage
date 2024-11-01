import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config.js';
import logger from './logger.js';

export const rateLimiter = new RateLimiterMemory({
  points: config.rateLimit.maxRequests,
  duration: config.rateLimit.windowMs / 1000
});

export async function checkRateLimit() {
  try {
    await rateLimiter.consume(1);
    return true;
  } catch (error) {
    logger.warn('Rate limit exceeded');
    return false;
  }
}