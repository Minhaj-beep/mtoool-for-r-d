import type { SubscriptionPlan } from '../types/database';

export interface PlanLimits {
  maxMenus: number | null;
  maxCategories: number | null;
  maxDishes: number | null;
  maxImages: number | null;
  allowImages: boolean;
  googleReviewEnabled: boolean;
  removeWatermark: boolean;
  customBranding: boolean;
  analytics: boolean;
  multipleBranches: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxMenus: 1,
    maxCategories: 3,
    maxDishes: 10,
    maxImages: 0,
    allowImages: false,
    googleReviewEnabled: false,
    removeWatermark: false,
    customBranding: false,
    analytics: false,
    multipleBranches: false,
    customDomain: false,
    whiteLabel: false,
  },
  basic: {
    maxMenus: 1,
    maxCategories: 10,
    maxDishes: 50,
    maxImages: 50,
    allowImages: true,
    googleReviewEnabled: true,
    removeWatermark: true,
    customBranding: false,
    analytics: false,
    multipleBranches: false,
    customDomain: false,
    whiteLabel: false,
  },
  pro: {
    maxMenus: null,
    maxCategories: null,
    maxDishes: null,
    maxImages: 300,
    allowImages: true,
    googleReviewEnabled: true,
    removeWatermark: true,
    customBranding: true,
    analytics: true,
    multipleBranches: false,
    customDomain: false,
    whiteLabel: false,
  },
  enterprise: {
    maxMenus: null,
    maxCategories: null,
    maxDishes: null,
    maxImages: null,
    allowImages: true,
    googleReviewEnabled: true,
    removeWatermark: true,
    customBranding: true,
    analytics: true,
    multipleBranches: true,
    customDomain: true,
    whiteLabel: true,
  },
};

export const PLAN_PRICES = {
  basic: {
    monthly: 29,
    yearly: 290,
  },
  pro: {
    monthly: 79,
    yearly: 790,
  },
  enterprise: {
    monthly: 199,
    yearly: 1990,
  },
};

export function canPerformAction(
  plan: SubscriptionPlan,
  action: {
    type: 'create_menu' | 'create_category' | 'create_dish' | 'upload_image';
    currentCount?: number;
  }
): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan];

  switch (action.type) {
    case 'create_menu':
      if (limits.maxMenus !== null && (action.currentCount || 0) >= limits.maxMenus) {
        return {
          allowed: false,
          reason: `Your ${plan} plan allows only ${limits.maxMenus} menu(s). Upgrade to create more.`,
        };
      }
      break;

    case 'create_category':
      if (limits.maxCategories !== null && (action.currentCount || 0) >= limits.maxCategories) {
        return {
          allowed: false,
          reason: `Your ${plan} plan allows only ${limits.maxCategories} categories. Upgrade to create more.`,
        };
      }
      break;

    case 'create_dish':
      if (limits.maxDishes !== null && (action.currentCount || 0) >= limits.maxDishes) {
        return {
          allowed: false,
          reason: `Your ${plan} plan allows only ${limits.maxDishes} dishes. Upgrade to create more.`,
        };
      }
      break;

    case 'upload_image':
      if (!limits.allowImages) {
        return {
          allowed: false,
          reason: `Image uploads are not available on the ${plan} plan. Upgrade to add dish photos.`,
        };
      }
      if (limits.maxImages !== null && (action.currentCount || 0) >= limits.maxImages) {
        return {
          allowed: false,
          reason: `Your ${plan} plan allows only ${limits.maxImages} images. Upgrade to add more.`,
        };
      }
      break;
  }

  return { allowed: true };
}

export function getPlanDisplayName(plan: SubscriptionPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
