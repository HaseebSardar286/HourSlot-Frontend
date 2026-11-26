export type OwnerPlan = {
  planCode: string;
  planName: string;
  status: string;
  price: number;
  currency: string;
  billingInterval: string;
  entitlements: Record<string, unknown>;
  usage: {
    branches: number;
    staff: number;
    businesses: number;
  };
  unlocksAt: Record<string, string>;
};

export function hasFeature(plan: OwnerPlan | null, code: string): boolean {
  if (!plan) {
    return false;
  }
  return Boolean(plan.entitlements?.[code]);
}

export function atLimit(
  plan: OwnerPlan | null,
  usageKey: 'branches' | 'staff' | 'businesses',
  limitCode: string
): boolean {
  // Unknown plan (fetch failed): don't lock the UI; the API still enforces the real limit.
  if (!plan || plan.entitlements?.[limitCode] == null) {
    return false;
  }
  const max = Number(plan.entitlements[limitCode]);
  if (max >= 999) {
    return false;
  }
  return (plan.usage?.[usageKey] ?? 0) >= max;
}

export function upgradeHint(plan: OwnerPlan | null, code: string, feature: string): string {
  const current = plan?.planName || 'Starter';
  const target = plan?.unlocksAt?.[code] || 'a paid plan';
  return `Your ${current} plan does not include ${feature}. Upgrade to ${target} to unlock it.`;
}

export function limitHint(plan: OwnerPlan | null, limitCode: string, unit: string): string {
  // Plan not loaded (network/DB hiccup): say nothing rather than claim a 0 limit.
  if (!plan || plan.entitlements?.[limitCode] == null) {
    return `Manage your ${unit} here.`;
  }
  const current = plan.planName || 'Starter';
  const max = Number(plan?.entitlements?.[limitCode] ?? 0);
  const target = plan?.unlocksAt?.[limitCode] || 'a higher plan';
  // "branches" -> "branch", "staff members" -> "staff member" when the limit is 1.
  const label = max === 1 ? unit.replace(/(es|s)$/, (m) => (unit.endsWith('ches') ? '' : m === 'es' ? 'e' : '')) : unit;
  return `Your ${current} plan allows ${max} ${label}. Upgrade to ${target} to add more.`;
}
