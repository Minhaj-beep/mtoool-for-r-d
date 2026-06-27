// UI CHANGE: Enhanced settings page with Google Place ID instructions + YouTube video
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Restaurant } from '@/lib/types/database';
import { toast } from 'sonner';
import {
  Save,
  Upload,
  X,
  Link as LinkIcon,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    google_place_id: '',
    theme_color: '#000000',
    logo_url: '',
  });

  /* ================= Load ================= */

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseBrowser
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error || !data)
        throw new Error('Restaurant not found');

      setRestaurant(data);

      setFormData({
        name: data.name,
        google_place_id: data.google_place_id ?? '',
        theme_color: data.theme_color ?? '#000000',
        logo_url: data.logo_url ?? '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  /* ================= Logo Upload ================= */

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingLogo(true);

    try {
      const presignedResponse =
        await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

      const presignedData =
        await presignedResponse.json();

      if (!presignedResponse.ok)
        throw new Error(presignedData.error);

      const uploadResponse = await fetch(
        presignedData.uploadUrl,
        {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        }
      );

      if (!uploadResponse.ok)
        throw new Error('Upload failed');

      setFormData((prev) => ({
        ...prev,
        logo_url: presignedData.fileUrl,
      }));

      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo_url: '',
    }));
  };

  /* ================= Save ================= */

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(
        '/api/restaurant',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error);

      setRestaurant(data.restaurant);

      toast.success('Saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ================= Guards ================= */

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!restaurant) {
    return <div>No restaurant found</div>;
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your restaurant settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Restaurant Information
          </CardTitle>
          <CardDescription>
            Update branding and integrations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Name */}
          <div className="space-y-2">
            <Label>Restaurant Name</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>

            {formData.logo_url ? (
              <div className="flex gap-4 items-center">
                <img
                  src={formData.logo_url}
                  className="w-20 h-20 rounded border"
                />

                <Button
                  variant="outline"
                  onClick={handleRemoveLogo}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleLogoUpload}
                />

                <Button
                  variant="outline"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </>
            )}
          </div>

          {/* URL Slug */}
          <div className="space-y-2">
            <Label>Menu URL</Label>

            <Input
              value={`/menu/${restaurant.slug}`}
              disabled
            />
          </div>

          {/* GOOGLE PLACE ID SECTION */}
          <div className="space-y-3">

            <Label className="flex gap-2 items-center">
              Google Place ID
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Label>

            <Input
              value={formData.google_place_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  google_place_id:
                    e.target.value,
                })
              }
              placeholder="Enter Google Place ID"
            />

            {/* Instructions */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-3">

              <p className="text-sm font-medium">
                How to find your Google Place ID:
              </p>

              <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-4">
                <li>
                  Open Google Place ID Finder
                </li>
                <li>
                  Search your restaurant name
                </li>
                <li>
                  Click your restaurant
                </li>
                <li>
                  Copy the Place ID
                </li>
                <li>
                  Paste it above
                </li>
              </ol>

              {/* Direct link */}
              <a
                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                target="_blank"
                className="inline-flex items-center text-sm text-blue-600 hover:underline"
              >
                Open Google Place ID Finder
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>

              {/* YouTube video */}
              <div className="pt-3">
                <p className="text-sm font-medium mb-2">
                  Video tutorial:
                </p>

                <div className="aspect-video rounded overflow-hidden border">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/hkPQ36UXF28"
                    title="How to find Google Place ID"
                    allowFullScreen
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Theme Color */}
          <div className="space-y-2">
            <Label>Theme Color</Label>

            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.theme_color}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    theme_color:
                      e.target.value,
                  })
                }
                className="w-20"
              />

              <Input
                value={formData.theme_color}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    theme_color:
                      e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />

            {saving
              ? 'Saving...'
              : 'Save Changes'}
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}
