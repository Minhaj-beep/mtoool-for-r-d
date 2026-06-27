import { supabase } from '../supabase/client';
import type { User } from '../types/database';

export async function signUp(email: string, password: string, restaurantName: string, restaurantSlug: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw authError || new Error('Failed to create user');
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: restaurantName,
      slug: restaurantSlug,
      subscription_plan: 'free',
    })
    .select()
    .single();

  if (restaurantError || !restaurant) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw restaurantError || new Error('Failed to create restaurant');
  }

  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: authData.user.email!,
      restaurant_id: restaurant.id,
      role: 'admin',
    });

  if (userError) {
    throw userError;
  }

  return { user: authData.user, restaurant };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getRestaurantForUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('restaurant_id, restaurants(*)')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.restaurants || null;
}
