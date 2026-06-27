'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Restaurant } from '@/lib/types/database';
import { PLAN_LIMITS } from '@/lib/subscription/plans';
import {
  ExternalLink,
  Utensils,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUp,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Dish_variants= {
  id: string;
  name: string;
  price: number;
}

type PublicMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  dish_variants: Dish_variants[]
};

type PublicMenuCategory = {
  id: string;
  name: string;
  display_order: number;
  dishes: PublicMenuItem[];
};

function SkeletonLoader() {
  return (
    <div className="space-y-10 md:space-y-12 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
          <div className="px-6 py-5 md:px-8 md:py-6 bg-slate-100">
            <div className="h-8 bg-slate-200 rounded w-48"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((j) => (
              <div key={j} className="px-6 py-5 md:px-8 md:py-6">
                <div className="flex gap-4 md:gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-200 rounded-xl"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageModal({
  dish,
  themeColor,
  onClose
}: {
  dish: PublicMenuItem;
  themeColor: string;
  onClose: () => void;
}) {

  useEffect(() => {
    // prevent background scroll (better fix for mobile too)
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ✅ FIXED: added min-h-0 */}
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col min-h-0 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* IMAGE */}
        <div className="relative flex-shrink-0 rounded-2xl">
          <img
            src={dish.image_url!}
            alt={dish.name}
            className="w-full max-h-[60vh] object-contain bg-slate-50 rounded-2xl"
          />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* ✅ SCROLLABLE CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-6 md:p-8">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
              {dish.name}
            </h3>

            <div className="flex flex-col items-end gap-1">
              {dish.dish_variants?.length > 0 ? (
                <>
                  <div className="text-xs text-slate-500">Available Variants</div>
                  {dish.dish_variants.map((v) => (
                    <div key={v.id} className="text-lg font-semibold" style={{ color: themeColor }}>
                      {v.name} — ₹{v.price}
                    </div>
                  ))}
                </>
              ) : (
                <div
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: themeColor }}
                >
                  ₹{dish.price}
                </div>
              )}
            </div>
          </div>

          {dish.description && (
            <p className="text-slate-600 text-base md:text-lg leading-relaxed whitespace-pre-line">
              {dish.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DishBadges({
  dish,
  index,
  hasImage
}: {
  dish: PublicMenuItem;
  index: number;
  hasImage: boolean;
}) {
  const badges = [];

  if (index < 3 && hasImage) {
    badges.push({ text: "Chef's Special", icon: Award, color: "bg-amber-500" });
  } else if (index < 5) {
    badges.push({ text: "Popular", icon: TrendingUp, color: "bg-blue-500" });
  }

  const maxPrice =
    dish.dish_variants?.length > 0
      ? Math.max(...dish.dish_variants.map(v => v.price))
      : dish.price;

  if (hasImage && maxPrice > 200) {
    badges.push({ text: "Premium", icon: Sparkles, color: "bg-purple-500" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {badges.map((badge, i) => {
        const Icon = badge.icon;
        return (
          <Badge
            key={i}
            className={`${badge.color} text-white text-xs px-2 py-1 flex items-center gap-1`}
          >
            <Icon className="w-3 h-3" />
            {badge.text}
          </Badge>
        );
      })}
    </div>
  );
}

export default function PublicMenuPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<PublicMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<PublicMenuItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !loading) {
      const isMobile = window.innerWidth < 768;
      const initialExpanded = new Set<string>();

      categories.forEach((cat, index) => {
        if (!isMobile || index === 0) {
          initialExpanded.add(cat.id);
        }
      });

      setExpandedCategories(initialExpanded);
    }
  }, [categories, loading]);

  useEffect(() => {
    if (categories.length === 0 || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      }
    );

    categoryRefs.current.forEach((element) => {
      if (element) observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [categories, loading]);

  const loadMenu = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: restaurant, error: restaurantError } =
        await supabaseBrowser
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

      if (restaurantError || !restaurant) {
        setError('Restaurant not found');
        return;
      }

      const isExpired = restaurant.subscription_status === 'expired' ||
                       restaurant.subscription_status === 'canceled';
      const isOnHold = restaurant.is_on_hold === true;

      if (isExpired || isOnHold) {
        setRestaurant(restaurant);
        setError('subscription_unavailable');
        return;
      }

      setRestaurant(restaurant);

      const { data, error } = await supabaseBrowser
        .from('menu_categories')
        .select(`
          id,
          name,
          display_order,
          dishes (
            id,
            name,
            description,
            price,
            image_url,
            is_available,
            dish_variants (
              id,
              name,
              price
            )
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        setError('Failed to load menu');
        return;
      }

      const formatted: PublicMenuCategory[] =
      data?.map((category) => ({
        ...category,
        dishes:
          category.dishes?.map((item) => ({
            ...item,
            dish_variants: item.dish_variants ?? []  // 🔥 FIX
          })).filter((item) => item.is_available) ?? [],
      })) ?? [];

      setCategories(formatted);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const planLimits = restaurant
    ? PLAN_LIMITS[restaurant.subscription_plan]
    : null;

  const lastTrackedDishRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("Is is working? ", selectedDish, restaurant)
    if (!selectedDish || !restaurant) return;

    if (
      restaurant.subscription_plan !== 'pro' &&
      restaurant.subscription_plan !== 'enterprise'
    ) return;

    if (lastTrackedDishRef.current === selectedDish.id) return;
    lastTrackedDishRef.current = selectedDish.id;

    fetch('/api/analytics/dish-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dish_id: selectedDish.id,
        restaurant_id: restaurant.id,
      }),
    });
  }, [selectedDish, restaurant]);

  const showGoogleReview =
    planLimits?.googleReviewEnabled && restaurant?.google_place_id;

  const showWatermark = !planLimits?.removeWatermark;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        dishes: category.dishes.filter((dish) =>
          dish.name.toLowerCase().includes(query) ||
          dish.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.dishes.length > 0);
  }, [categories, searchQuery]);

  const featuredDishes = useMemo(() => {
    const allDishes = categories.flatMap((cat) => cat.dishes);
    const dishesWithImages = allDishes.filter((dish) => dish.image_url && planLimits?.allowImages);
    return dishesWithImages.slice(0, 6);
  }, [categories, planLimits]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current.get(categoryId);
    if (element) {
      const offset = 180;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (error === 'subscription_unavailable' && restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Service Temporarily Unavailable
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We apologize for the inconvenience. This digital menu is currently unavailable as the subscription may have expired or the service is on hold.
          </p>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-16 h-16 rounded-full mx-auto mb-4 object-cover border-2 border-white shadow-md"
              />
            )}
            <p className="text-lg text-slate-900 font-bold mb-2">
              {restaurant.name}
            </p>
            <p className="text-sm text-slate-600">
              Please contact the restaurant directly for assistance or visit us in person to view our menu.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Utensils className="w-10 h-10 text-slate-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Menu Not Found
          </h1>
          <p className="text-slate-600 text-lg">
            {error || 'This menu is not available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 md:pb-8">
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${restaurant.theme_color} 0%, ${restaurant.theme_color}dd 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 drop-shadow-lg">
                {restaurant.name}
              </h1>
              <p className="text-white/90 text-lg md:text-xl font-medium">
                Digital Menu
              </p>
            </div>

            {restaurant.logo_url && (
              <div className="flex-shrink-0">
                <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full bg-white shadow-2xl p-2 ring-4 ring-white/30">
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-8 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 text-base border-slate-300 focus:border-2 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredCategories.length > 1 && !searchQuery && (
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-y border-slate-200 shadow-sm mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                    activeCategory === category.id
                      ? 'text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={
                    activeCategory === category.id
                      ? { backgroundColor: restaurant.theme_color }
                      : {}
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="py-8 md:py-12">
          {showGoogleReview && (
            <div className="mb-10">
              <a
                href={`https://search.google.com/local/writereview?placeid=${restaurant.google_place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  className="w-full text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] text-base md:text-lg py-6 md:py-7"
                  size="lg"
                  style={{ backgroundColor: restaurant.theme_color }}
                >
                  <Star className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
                  Leave us a Review on Google
                  <ExternalLink className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Button>
              </a>
            </div>
          )}

          {featuredDishes.length > 0 && !searchQuery && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6" style={{ color: restaurant.theme_color }} />
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                  Featured Dishes
                </h2>
              </div>
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {featuredDishes.map((dish, index) => (
                    <div
                      key={dish.id}
                      className="flex-shrink-0 w-64 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden snap-start cursor-pointer transform hover:scale-105"
                      onClick={() => setSelectedDish(dish)}
                    >
                      <div className="relative h-48">
                        <img
                          src={dish.image_url!}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <DishBadges dish={dish} index={index} hasImage={true} />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">
                          {dish.name}
                        </h3>
                        {dish.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {dish.description}
                          </p>
                        )}
                        <div
                          className="inline-flex flex-col items-start px-3 py-1.5 rounded-lg text-sm font-semibold"
                          style={{
                            backgroundColor: `${restaurant.theme_color}15`,
                            color: restaurant.theme_color,
                          }}
                        >
                          {dish.dish_variants?.length > 0 ? (
                            dish.dish_variants.map((v) => (
                              <span key={v.id}>
                                {v.name} — ₹{v.price}
                              </span>
                            ))
                          ) : (
                            <span className="text-lg font-bold">
                              ₹{dish.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filteredCategories.length === 0 ? (
            <div className="text-center py-20 md:py-24 bg-white rounded-2xl shadow-sm">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                No dishes found
              </h3>
              <p className="text-slate-600 text-lg mb-4">
                Try searching with different keywords
              </p>
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {filteredCategories.map((category, categoryIndex) => {
                const isExpanded = expandedCategories.has(category.id);
                const dishCount = category.dishes.length;

                return (
                  <div
                    key={category.id}
                    id={category.id}
                    ref={(el) => {
                      if (el) categoryRefs.current.set(category.id, el);
                    }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-100"
                  >
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-6 py-5 md:px-8 md:py-6 relative overflow-hidden text-left hover:bg-slate-50 transition-colors"
                      style={{
                        background: `linear-gradient(135deg, ${restaurant.theme_color}15 0%, ${restaurant.theme_color}08 100%)`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge
                            className="text-lg md:text-xl font-bold px-4 py-1.5 shadow-sm"
                            style={{
                              backgroundColor: restaurant.theme_color,
                              color: 'white',
                            }}
                          >
                            {categoryIndex + 1}
                          </Badge>
                          <div>
                            <h2
                              className="text-2xl md:text-3xl font-bold"
                              style={{ color: restaurant.theme_color }}
                            >
                              {category.name}
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                              {dishCount} {dishCount === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-slate-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    <div
                      className={`transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? 'max-h-[10000px] opacity-100'
                          : 'max-h-0 opacity-0 overflow-hidden'
                      }`}
                    >
                      <div className="divide-y divide-slate-100">
                        {category.dishes.length === 0 ? (
                          <div className="px-6 py-12 md:px-8 md:py-16 text-center text-slate-500">
                            <p className="text-lg">No items in this category yet</p>
                          </div>
                        ) : (
                          category.dishes.map((item, dishIndex) => {
                            const hasImage = item.image_url && planLimits?.allowImages;
                            return (
                              <div
                                key={item.id}
                                className="px-6 py-5 md:px-8 md:py-6 hover:bg-slate-50 transition-colors duration-200"
                              >
                                <div className="flex gap-4 md:gap-6">
                                  {hasImage && (
                                    <div className="flex-shrink-0">
                                      <button
                                        onClick={() => setSelectedDish(item)}
                                        className="block group relative overflow-hidden rounded-xl"
                                      >
                                        <img
                                          src={item.image_url!}
                                          alt={item.name}
                                          className="w-24 h-24 md:w-32 md:h-32 object-cover shadow-md ring-1 ring-slate-200 transition-transform group-hover:scale-110"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <Search className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <DishBadges dish={item} index={dishIndex} hasImage={!!hasImage} />
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 md:gap-4">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5">
                                          {item.name}
                                        </h3>
                                        {item.description && (
                                          <p className="text-sm md:text-base text-slate-600 leading-relaxed line-clamp-2">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        <div
                                          className="inline-flex flex-col items-start px-4 py-2 rounded-lg text-sm md:text-base font-semibold shadow-sm gap-0.5"
                                          style={{
                                            backgroundColor: `${restaurant.theme_color}15`,
                                            color: restaurant.theme_color,
                                          }}
                                        >
                                          {item.dish_variants?.length > 0 ? (
                                            item.dish_variants.map((v) => (
                                              <span key={v.id} className="leading-tight">
                                                {v.name} — ₹{v.price}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-xl md:text-2xl font-bold">
                                              ₹{item.price}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showWatermark && (
            <div className="mt-16 text-center pb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-sm border border-slate-200">
                <Utensils className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Powered by <span className="font-bold text-slate-900">mtoool menu</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-around py-3 px-4">
          <button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              input?.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs font-medium">Search</span>
          </button>

          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all"
              style={{
                color: restaurant.theme_color,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: restaurant.theme_color }}
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">Top</span>
            </button>
          )}
        </div>
      </div>

      {selectedDish && (
        <ImageModal
          dish={selectedDish}
          themeColor={restaurant.theme_color}
          onClose={() => setSelectedDish(null)}
        />
      )}
    </div>
  );
}
