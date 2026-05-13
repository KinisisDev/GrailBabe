/**
 * Inngest function registry — import all functions here so they
 * are registered in apps/web/src/app/api/inngest/route.ts
 */

// Phase 03 — Price cron + weekly digest
export { priceCron, weeklyDigest } from './priceCron';

// Phase 05 — Trade matching
export { tradeMatchingCron, checkTradeMatchForUser } from './tradeMatching';

// Phase 05 — Push notifications + portfolio snapshot
export { sendPushOnNotification, dailyPortfolioSnapshot } from './pushNotifications';
