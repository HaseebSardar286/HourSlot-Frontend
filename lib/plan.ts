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
  if (!plan) {
    return true;
  }
  const max = Number(plan.entitlements?.[limitCode] ?? 0);
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
  const current = plan?.planName || 'Starter';
  const max = Number(plan?.entitlements?.[limitCode] ?? 0);
  const target = plan?.unlocksAt?.[limitCode] || 'a higher plan';
  return `Your ${current} plan allows ${max} ${unit}. Upgrade to ${target} to add more.`;
}
