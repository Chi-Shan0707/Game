// Server-side compliance helpers

export const TOPIC_BLACKLIST = [
  'politics',
  'judicial',
  'national_security',
  'public_health_emergency',
  'stock_price',
  'derivatives',
  'individual_private',
  'sports_betting'
];

export function isTopicAllowed(category?: string | null): boolean {
  if (!category) return true;
  const c = category.toLowerCase();
  return !TOPIC_BLACKLIST.includes(c);
}

export function enforceNoPurchaseRoutes() {
  // Runtime guard placeholder: ensure no purchase endpoints exist.
  // TODO: Integrate with route registry or framework-level middleware.
  return true;
}

export function dailyEarnLimit(userId: string): { maxPerDay: number } {
  // Placeholder: implement DB-backed per-user daily accumulation checks.
  return { maxPerDay: 500 }; // TODO: tune policy and persist counters
}

export function isKycEligible(user: any): boolean {
  // For leaderboard eligibility, optionally require KYC. Stub: check flag
  return !!user && !!user.email; // TODO: integrate with verified KYC provider if required
}

// TODO: Seek legal review of blacklist taxonomy and KYC gates for Mainland China.
