// app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Restaurant } from '@/lib/types/database';
import {
  FolderOpen,
  Utensils,
  Crown,
  Image as ImageIcon,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { PLAN_LIMITS } from '@/lib/subscription/plans';
import { format } from 'date-fns';

// Recharts imports
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

type Stats = {
  totalCategories: number;
  totalDishes: number;
};

type DishViewStat = {
  dish_id: string;
  dish_name: string;
  views: number;
};

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalCategories: 0,
    totalDishes: 0,
  });
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [dishViewStats, setDishViewStats] = useState<DishViewStat[]>([]);
  const [totalViews30d, setTotalViews30d] = useState<number>(0);
  const [viewsLoading, setViewsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1️⃣ Auth user
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // 2️⃣ Restaurant owned by user
      const { data: restaurantData, error: restaurantError } =
        await supabaseBrowser
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

      if (restaurantError || !restaurantData) {
        throw new Error('Restaurant not found');
      }

      setRestaurant(restaurantData);

      // 3️⃣ Categories count
      const { data: categoriesData, error: categoriesError } =
        await supabaseBrowser
          .from('menu_categories')
          .select('id')
          .eq('restaurant_id', restaurantData.id);

      if (categoriesError) throw categoriesError;

      // 4️⃣ Dishes count (JOIN via categories)
      const { data: dishesData, error: dishesError } =
        await supabaseBrowser
          .from('dishes')
          .select('id, menu_categories!inner(restaurant_id)')
          .eq('menu_categories.restaurant_id', restaurantData.id);

      if (dishesError) throw dishesError;

      setStats({
        totalCategories: categoriesData?.length ?? 0,
        totalDishes: dishesData?.length ?? 0,
      });

      // 5️⃣ Load analytics only for pro / enterprise
      if (
        restaurantData.subscription_plan === 'pro' ||
        restaurantData.subscription_plan === 'enterprise'
      ) {
        await loadAnalytics(restaurantData.id);
      }

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Analytics loader
     ========================= */
  const loadAnalytics = async (restaurantId: string) => {
    try {
      setViewsLoading(true);

      // last 30 days (inclusive)
      const since = new Date();
      since.setDate(since.getDate() - 29); // 30 days total including today
      const sinceDate = since.toISOString().slice(0, 10);

      // Query daily views joined with dishes
      // Each row: { views, day, dishes: { id, name } }
      const { data: viewsData, error: viewsError } =
        await supabaseBrowser
          .from('dish_views_daily')
          .select(`
            views,
            day,
            dishes (
              id,
              name
            )
          `)
          .eq('restaurant_id', restaurantId)
          .gte('day', sinceDate)
          .order('day', { ascending: true });

      if (viewsError) {
        console.error('Failed to load dish views:', viewsError);
        return;
      }

      // Aggregate per dish
      const map = new Map<string, DishViewStat>();
      let total = 0;

      (viewsData || []).forEach((row: any) => {
        const dish = row.dishes;
        if (!dish?.id) return;
        const dishId = dish.id as string;
        const dishName = dish.name as string;
        const v = row.views ?? 0;

        total += v;

        if (!map.has(dishId)) {
          map.set(dishId, {
            dish_id: dishId,
            dish_name: dishName,
            views: v,
          });
        } else {
          const existing = map.get(dishId)!;
          existing.views += v;
        }
      });

      const arr = Array.from(map.values()).sort((a, b) => b.views - a.views);
      setDishViewStats(arr);
      setTotalViews30d(total);
    } catch (err) {
      console.error('Analytics loading error:', err);
    } finally {
      setViewsLoading(false);
    }
  };

  /* =========================
     Guard states (IMPORTANT)
     ========================= */

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500 text-center">
            No restaurant found. Please set up your restaurant first.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* =========================
     Safe usage below
     ========================= */

  const planLimits = PLAN_LIMITS[restaurant.subscription_plan];

  const getUsagePercentage = (current: number, max: number | null) => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // Derived analytics metrics
  const avgViewsPerDish = dishViewStats.length > 0
    ? Math.round(totalViews30d / dishViewStats.length)
    : 0;

  const topDish = dishViewStats.length > 0 ? dishViewStats[0] : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-600 mt-2 text-base">
          Welcome back! Here's an overview of your restaurant.
        </p>
      </div>

      {/* Restaurant Card with Enhanced Styling */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
              <CardDescription className="text-base mt-1 flex items-center gap-2">
                <span className="text-slate-400">/</span>
                <span className="font-mono">{restaurant.slug}</span>
              </CardDescription>
            </div>
            <Badge
              className={`${
                restaurant.subscription_plan === 'free'
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              } px-4 py-2 text-sm font-semibold`}
            >
              <Crown className="w-4 h-4 mr-1.5" />
              {restaurant.subscription_plan.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid with Better Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Categories */}
        <StatCard
          title="Categories"
          icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
          value={stats.totalCategories}
          max={planLimits.maxCategories}
          getUsagePercentage={getUsagePercentage}
          getStatusColor={getStatusColor}
        />

        {/* Dishes */}
        <StatCard
          title="Dishes"
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
          value={stats.totalDishes}
          max={planLimits.maxDishes}
          getUsagePercentage={getUsagePercentage}
          getStatusColor={getStatusColor}
        />

        {/* Images */}
        <StatCard
          title="Image Storage"
          icon={<ImageIcon className="h-4 w-4 text-muted-foreground" />}
          value={restaurant.image_count ?? 0}
          max={planLimits.maxImages}
          getUsagePercentage={getUsagePercentage}
          getStatusColor={getStatusColor}
          unavailable={!planLimits.allowImages}
        />

        {/* Subscription */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {restaurant.subscription_plan}
            </div>

            {restaurant.subscription_status && (
              <Badge className="mt-2 text-xs">
                {restaurant.subscription_status}
              </Badge>
            )}

            {restaurant.subscription_expires_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Calendar className="h-3 w-3" />
                Expires{' '}
                {format(
                  new Date(restaurant.subscription_expires_at),
                  'MMM dd, yyyy'
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Menu Performance (Analytics) - Only for pro / enterprise */}
      {(restaurant.subscription_plan === 'pro' ||
        restaurant.subscription_plan === 'enterprise') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Menu Performance
            </h2>
            <p className="text-slate-600 mt-1">
              How customers interact with your menu (last 30 days)
            </p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              title="Total Views"
              value={viewsLoading ? <Skeleton className="h-6 w-28" /> : totalViews30d}
              subtitle="Last 30 days"
            />

            <KpiCard
              title="Avg Views / Dish"
              value={viewsLoading ? <Skeleton className="h-6 w-28" /> : avgViewsPerDish}
              subtitle="Engagement per item"
            />

            <KpiCard
              title="Top Dish"
              value={viewsLoading ? <Skeleton className="h-6 w-40" /> : (topDish ? `${topDish.dish_name} • ${topDish.views} views` : 'No data yet')}
              subtitle="Most viewed item"
            />
          </div>

          {/* Dish-wise horizontal bars */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Top Viewed Dishes</CardTitle>
              <CardDescription>
                Ranked by total views (last 30 days)
              </CardDescription>
            </CardHeader>

            <CardContent>
              {viewsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : dishViewStats.length === 0 ? (
                <div className="text-sm text-slate-500">No view data yet — views will appear here when customers open dishes from the public menu.</div>
              ) : (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={dishViewStats.slice(0, 8).map(d => ({
                        name: d.dish_name,
                        value: d.views,
                      }))}
                      margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={180}
                        tick={{ fontSize: 13 }}
                      />
                      <Tooltip
                        formatter={(value: any) => [value, 'Views']}
                        wrapperStyle={{ zIndex: 50 }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 6, 6]}
                        isAnimationActive={true}
                      >
                        {dishViewStats.slice(0, 8).map((d, idx) => {
                          // color scale: darker for top
                          const base = 220 - idx * 18;
                          const color = `rgb(${Math.max(base - 30, 40)}, ${Math.max(base - 60, 60)}, ${Math.max(base - 120, 80)})`;
                          return <Cell key={d.dish_id} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade CTA with Better Design */}
      {restaurant.subscription_plan === 'free' && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-amber-900 text-xl">
                  Upgrade Your Plan
                </CardTitle>
                <CardDescription className="text-amber-700 mt-1.5 text-base">
                  Unlock image uploads, more categories, and access to menu analytics.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

/* =========================
   UI CHANGE: Enhanced Stat Card with better visual hierarchy and hover effects
   ========================= */

function StatCard({
  title,
  icon,
  value,
  max,
  unavailable,
  getUsagePercentage,
  getStatusColor,
}: {
  title: string;
  icon: React.ReactNode;
  value: number;
  max: number | null;
  unavailable?: boolean;
  getUsagePercentage: (current: number, max: number | null) => number;
  getStatusColor: (percentage: number) => string;
}) {
  if (unavailable) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
          <div className="text-amber-500">{icon}</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 font-medium">
            Not available on this plan
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentage = getUsagePercentage(value, max);

  return (
    <Card className="border-slate-200 hover:shadow-md transition-all hover:border-slate-300">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
        <div className="text-slate-500">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>

        {max ? (
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  percentage >= 90
                    ? 'bg-red-500'
                    : percentage >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p
              className={`text-xs font-semibold ${getStatusColor(percentage)}`}
            >
              {value} of {max} used
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-2 font-medium">Unlimited</p>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================
   KPI Card component
   ========================= */

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number | React.ReactNode;
  subtitle: string;
}) {
  return (
    <Card className="border-slate-200 hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">
          {value}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
