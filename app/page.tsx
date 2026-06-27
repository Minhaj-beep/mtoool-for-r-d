'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Zap,
  Shield,
  Crown,
  ArrowRight,
  Check,
} from 'lucide-react';

type BillingCycle = 'monthly' | 'yearly';

type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  billing_cycle: BillingCycle;
  price_inr: number;
  is_popular: boolean;
  features: Record<string, any>;
  limits: Record<string, any>;
};

/* -----------------------------
   MARKETING FEATURE BUILDER
-------------------------------- */

function getPlanFeatures(plan: SubscriptionPlan): string[] {
  const f = plan.features || {};
  const l = plan.limits || {};

  const features: string[] = [];

  // Core limits
  if (l.dishes === -1) features.push('Unlimited dishes');
  else if (l.dishes) features.push(`${l.dishes} dishes`);

  if (l.categories === -1)
    features.push('Unlimited categories');
  else if (l.categories)
    features.push(`${l.categories} categories`);

  // Photos
  if (f.photos === -1) features.push('Unlimited photos');
  else if (typeof f.photos === 'number' && f.photos > 0)
    features.push(`${f.photos} dish photos`);

  // Branding / trust
  if (f.watermark === false)
    features.push('No watermark');

  if (f.google_review)
    features.push('Google review integration');

  if (f.analytics) features.push('Menu analytics');

  if (f.branding) features.push('Custom branding');

  if (f.white_label) features.push('White-label menu');

  if (f.custom_domain) features.push('Custom domain');

  if (f.dedicated_support)
    features.push('Dedicated support');

  return features.slice(0, 7); // 👈 marketing discipline
}

export default function HomePage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      const { data } = await supabaseBrowser
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_inr');

      setPlans(data || []);
      setLoadingPlans(false);
    };

    loadPlans();
  }, []);

  const visiblePlans = plans.filter(
    (p) => p.billing_cycle === billingCycle
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* NAV */}
      <nav className="border-b border-slate-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img
              src="/android-chrome-512x512.png"
              className="w-10 h-10 md:w-15 md:h-15 rounded-md"
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">mtoool menu</span>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-slate-100 transition-colors">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="shadow-sm hover:shadow-md transition-all hover:scale-105">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-100/60 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 sm:mb-8 tracking-tight leading-tight">
            Digital Menus Made{' '}
            <span className="bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">Simple</span>
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Create beautiful QR-based menus for your restaurant.
            Update instantly. No apps for customers.
          </p>
          <Link href="/signup">
            <Button size="lg" className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
              Start Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="py-16 sm:py-20 px-4 bg-white/60">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-slate-900">
            The Problem with Traditional Menus
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 mb-12">
            <div className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Expensive to Print</h3>
              <p className="text-sm text-slate-600">Every menu change means costly reprinting</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Hard to Update</h3>
              <p className="text-sm text-slate-600">Price changes and new items take days</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">😕</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Poor Experience</h3>
              <p className="text-sm text-slate-600">PDF menus are hard to read on phones</p>
            </div>
          </div>
          <div className="text-center py-8 px-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-xl">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">mtoool menu solves this</h3>
            <p className="text-base sm:text-lg text-slate-100 max-w-2xl mx-auto">
              A digital menu that updates instantly, looks beautiful on any device, and costs less than a single menu reprint.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 text-center mb-12 sm:mb-16">
            Get your digital menu live in minutes
          </p>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl sm:text-4xl font-bold">1</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900">Create Your Menu</h3>
              <p className="text-slate-600 leading-relaxed">
                Add your dishes, categories, and photos through our simple dashboard
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl sm:text-4xl font-bold">2</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900">Download Your QR</h3>
              <p className="text-slate-600 leading-relaxed">
                Generate and download your unique QR code to print or display
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl sm:text-4xl font-bold">3</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900">Customers Scan & View</h3>
              <p className="text-slate-600 leading-relaxed">
                Diners scan to see your beautiful menu instantly on their phone
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
      </div>

      {/* WHY CHOOSE */}
      <section className="py-16 sm:py-20 px-4 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12 sm:mb-16 text-slate-900 tracking-tight">
            Why Choose mtoool menu
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mb-12">
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Zap className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Instant Updates</h3>
                <p className="text-sm text-slate-600">Change prices or add items anytime. Updates go live immediately.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Shield className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">No App Required</h3>
                <p className="text-sm text-slate-600">Customers just scan and view. Nothing to download or install.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1 text-xl">🇮🇳</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Built for Indian Restaurants</h3>
                <p className="text-sm text-slate-600">UPI payments, INR pricing, and local support included.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1 text-xl">💰</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Affordable Pricing</h3>
                <p className="text-sm text-slate-600">Costs less than printing new menus. No credit card required to start.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1 text-xl">📱</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Mobile-First Design</h3>
                <p className="text-sm text-slate-600">Looks stunning on every phone. Your dishes shine with clear photos.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-6 h-6 text-slate-900 flex-shrink-0 mt-1 text-xl">✨</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Cancel Anytime</h3>
                <p className="text-sm text-slate-600">No long-term contracts. Pause or cancel your subscription anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
      </div>

      {/* PRICING */}
      <section className="py-20 sm:py-28 lg:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Simple Pricing
          </h2>
          <p className="text-base sm:text-lg text-slate-600">Choose the perfect plan for your restaurant</p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <div className="bg-slate-100/80 p-1.5 rounded-2xl flex shadow-inner">
            {(['monthly', 'yearly'] as BillingCycle[]).map(
              (cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-6 sm:px-8 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all ${
                    billingCycle === cycle
                      ? 'bg-white shadow-md text-slate-900 scale-105'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  {cycle === 'yearly' && (
                    <span className="ml-1.5 text-green-600 font-bold">
                      Save
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {loadingPlans ? (
          <p className="text-center text-slate-500 text-lg">
            Loading plans…
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 max-w-7xl mx-auto px-4">
            {visiblePlans.map((plan) => {
              const features = getPlanFeatures(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-8 sm:p-10 bg-white transition-all hover:scale-[1.02] ${
                    plan.is_popular
                      ? 'border-2 border-slate-900 shadow-2xl ring-4 ring-slate-900/5 lg:scale-105 lg:hover:scale-[1.07]'
                      : 'border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-300'
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg">
                      <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900 tracking-tight">
                    {plan.name}
                  </h3>

                  <div className="mb-8 pb-8 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight">
                        ₹{plan.price_inr}
                      </span>
                      <span className="text-base sm:text-lg text-slate-500 font-medium">
                        /{plan.billing_cycle}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10 text-sm sm:text-base">
                    {features.map((text) => (
                      <li
                        key={text}
                        className="flex items-start gap-3"
                      >
                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 leading-relaxed">{text}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup">
                    <Button
                      className={`w-full h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all hover:scale-105 ${
                        plan.is_popular
                          ? 'shadow-lg hover:shadow-xl'
                          : 'shadow-md hover:shadow-lg'
                      }`}
                      variant={
                        plan.is_popular
                          ? 'default'
                          : 'outline'
                      }
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50/50 py-10 sm:py-12 text-center">
        <p className="text-sm sm:text-base text-slate-600">
          &copy; {new Date().getFullYear()} mtoool menu. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
