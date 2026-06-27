'use client';

import Script from "next/script";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    restaurantName: '',
    restaurantSlug: '',
    googlePlaceId: '',
    latitude: '',
    longitude: '',
    address: '',
    city: '',
    country: '',
  });

  /* -----------------------------
     GOOGLE AUTOCOMPLETE
  -------------------------------- */

  useEffect(() => {
    if (!googleLoaded) return;
    if (!locationInputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(
      locationInputRef.current,
      {
        types: ['establishment'],
        fields: [
          'place_id',
          'geometry',
          'formatted_address',
          'address_components',
          'name'
        ]
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.geometry) return;

      const lat = place.geometry.location?.lat();
      const lng = place.geometry.location?.lng();

      let city = '';
      let country = '';

      place.address_components?.forEach((component) => {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }

        if (component.types.includes('country')) {
          country = component.long_name;
        }
      });

      const name = place.name || '';

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      setFormData(prev => ({
        ...prev,
        restaurantName: name || prev.restaurantName,
        restaurantSlug: slug || prev.restaurantSlug,
        googlePlaceId: place.place_id || '',
        latitude: lat?.toString() || '',
        longitude: lng?.toString() || '',
        address: place.formatted_address || '',
        city,
        country
      }));
    });

  }, [googleLoaded]);

  /* -----------------------------
     SLUG HANDLER
  -------------------------------- */

  const handleSlugChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    setFormData({
      ...formData,
      restaurantName: name,
      restaurantSlug: slug
    });
  };

  /* -----------------------------
     SUBMIT
  -------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      toast.success('Account created successfully');

      router.push('/login');

    } catch (error: any) {
      toast.error(error.message);

    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     UI
  -------------------------------- */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">

      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => setGoogleLoaded(true)}
      />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">

          <div className="flex items-center justify-center mb-4">
            <div className="bg-slate-900 p-3 rounded-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>

          <CardTitle className="text-2xl text-center">
            Create your account
          </CardTitle>

          <CardDescription className="text-center">
            Start managing your digital menu today
          </CardDescription>

        </CardHeader>

        <CardContent>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* LOCATION */}
            <div className="space-y-2">
              <Label>Restaurant Location</Label>
              <Input
                ref={locationInputRef}
                placeholder="Search your restaurant"
                required
              />
            </div>

            {/* NAME */}
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input
                value={formData.restaurantName}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="My Restaurant"
                required
              />
            </div>

            {/* SLUG */}
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input
                value={formData.restaurantSlug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    restaurantSlug: e.target.value
                  })
                }
                placeholder="my-restaurant"
                required
              />

              <p className="text-xs text-muted-foreground">
                Your menu will be at: /menu/{formData.restaurantSlug || 'your-slug'}
              </p>
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="restaurant@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                }
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                minLength={8}
                value={formData.password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password: e.target.value
                  })
                }
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}