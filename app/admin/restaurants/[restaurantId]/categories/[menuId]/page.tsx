'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Restaurant } from '@/lib/types/database';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_LIMITS } from '@/lib/subscription/plans';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type Dish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  dishes: Dish[];
};

/* -------------------------------------------------------------------------- */

export default function MenuEditPage() {
  const params = useParams();

  const { restaurantId } = params as {
    restaurantId: string;
    menuId: string;
  };

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [categories, setCategories] =
    useState<MenuCategory[]>([]);

  const [loading, setLoading] = useState(true);

  const [categoryDialogOpen, setCategoryDialogOpen] =
    useState(false);

  const [dishDialogOpen, setDishDialogOpen] =
    useState(false);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] =
    useState('');

  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
  });

  const [uploadingImage, setUploadingImage] =
    useState(false);

  /* -------------------------------------------------------------------------- */
  /*                                   LOAD                                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) return;

      // 🔑 Restaurant ownership check
      const { data: restaurantData, error: restaurantError } =
        await supabaseBrowser
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .eq('owner_id', user.id)
          .single();

      if (restaurantError || !restaurantData) {
        throw new Error('Restaurant not found');
      }

      setRestaurant(restaurantData);

      // 📂 Load categories + dishes (CORRECT TABLE: dishes)
      const { data, error } = await supabaseBrowser
        .from('menu_categories')
        .select(`
          id,
          name,
          display_order,
          is_active,
          dishes (
            id,
            name,
            description,
            price,
            image_url,
            is_available
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setCategories(data ?? []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                             CREATE CATEGORY                                 */
  /* -------------------------------------------------------------------------- */

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          restaurant_id: restaurantId,
          display_order: categories.length,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Category created');
      setNewCategoryName('');
      setCategoryDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                               IMAGE UPLOAD                                  */
  /* -------------------------------------------------------------------------- */

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;

    const limits =
      PLAN_LIMITS[restaurant.subscription_plan];

    if (!limits.allowImages) {
      toast.error('Images not allowed on your plan');
      return;
    }

    setUploadingImage(true);

    try {
      const res = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setNewDish((d) => ({
        ...d,
        image_url: data.fileUrl,
      }));

      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                               CREATE DISH                                   */
  /* -------------------------------------------------------------------------- */

  const createDish = async () => {
    if (!newDish.name || !newDish.price) {
      toast.error('Dish name and price are required');
      return;
    }

    if (!selectedCategoryId) {
      toast.error('Select a category');
      return;
    }

    try {
      const response = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDish,
          price: Number(newDish.price),
          category_id: selectedCategoryId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Dish created');
      setDishDialogOpen(false);
      setSelectedCategoryId(null);
      setNewDish({
        name: '',
        description: '',
        price: '',
        image_url: '',
        is_available: true,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                         TOGGLE DISH AVAILABILITY                             */
  /* -------------------------------------------------------------------------- */

  const toggleDishAvailability = async (
    dishId: string,
    current: boolean
  ) => {
    try {
      await fetch(`/api/dishes/${dishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !current }),
      });

      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  /* -------------------------------------------------------------------------- */

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Menu Categories
        </h1>

        <Dialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Create a new menu category
              </DialogDescription>
            </DialogHeader>

            <Label>Category name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) =>
                setNewCategoryName(e.target.value)
              }
            />

            <DialogFooter>
              <Button onClick={createCategory}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>{category.name}</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setSelectedCategoryId(category.id);
                setDishDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Dish
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {category.dishes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center">
                No dishes in this category
              </p>
            ) : (
              category.dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex gap-4 p-4 border rounded-lg"
                >
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="font-medium">
                      {dish.name}
                    </h4>
                    {dish.description && (
                      <p className="text-sm text-slate-500">
                        {dish.description}
                      </p>
                    )}
                    <p className="font-semibold mt-1">
                      ₹ {dish.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dish.is_available}
                      onCheckedChange={() =>
                        toggleDishAvailability(
                          dish.id,
                          dish.is_available
                        )
                      }
                    />
                    <Badge>
                      {dish.is_available
                        ? 'Available'
                        : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}

      {/* ----------------------------- ADD DISH DIALOG ----------------------------- */}

      <Dialog open={dishDialogOpen} onOpenChange={setDishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dish</DialogTitle>
            <DialogDescription>
              Create a new dish
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Dish name"
              value={newDish.name}
              onChange={(e) =>
                setNewDish({
                  ...newDish,
                  name: e.target.value,
                })
              }
            />

            <Textarea
              placeholder="Description"
              value={newDish.description}
              onChange={(e) =>
                setNewDish({
                  ...newDish,
                  description: e.target.value,
                })
              }
            />

            <Input
              type="number"
              placeholder="Price"
              value={newDish.price}
              onChange={(e) =>
                setNewDish({
                  ...newDish,
                  price: e.target.value,
                })
              }
            />

            {restaurant &&
              PLAN_LIMITS[restaurant.subscription_plan]
                .allowImages && (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              )}
          </div>

          <DialogFooter>
            <Button onClick={createDish}>
              Add Dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
