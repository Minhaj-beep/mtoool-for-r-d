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
import { Category, Dish, Restaurant } from '@/lib/types/database';
import {
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_LIMITS } from '@/lib/subscription/plans';

export default function MenuEditPage() {
  const params = useParams();
  const menuId = params.id as string;

  const [categories, setCategories] = useState<
    (Category & { dishes: Dish[] })[]
  >([]);
  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const [categoryDialogOpen, setCategoryDialogOpen] =
    useState(false);
  const [dishDialogOpen, setDishDialogOpen] =
    useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);
  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [newCategory, setNewCategory] =
    useState({ name: '' });

  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) return;

      // 🔑 Get restaurant owned by this user
      const { data: restaurantData, error } =
        await supabaseBrowser
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .single();

      if (error || !restaurantData) {
        throw new Error('Restaurant not found');
      }

      setRestaurant(restaurantData);

      // 📂 Load categories + dishes for this menu
      const { data: categoriesData, error: catError } =
        await supabaseBrowser
          .from('menu_categories')
          .select('*, restaurant:restaurants(*), dishes(*)')
          .eq('id', menuId)
          .order('display_order', {
            ascending: true,
          });

      if (catError) {
        throw catError;
      }

      setCategories(categoriesData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.name,
          restaurant_id: menuId,
          display_order: categories.length,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success('Category created');
      setCategoryDialogOpen(false);
      setNewCategory({ name: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;

    const limits =
      PLAN_LIMITS[restaurant.subscription_plan];

    if (!limits.allowImages) {
      toast.error(
        'Image uploads are not available on your plan'
      );
      return;
    }

    setUploadingImage(true);

    try {
      const response = await fetch(
        '/api/upload/presigned-url',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      setNewDish({
        ...newDish,
        image_url: data.fileUrl,
      });

      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const createDish = async () => {
    if (!newDish.name || !newDish.price) {
      toast.error(
        'Dish name and price are required'
      );
      return;
    }

    if (!selectedCategory) {
      toast.error('Select a category first');
      return;
    }

    try {
      const response = await fetch('/api/dishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newDish,
          price: Number(newDish.price),
          category_id: selectedCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success('Dish created');
      setDishDialogOpen(false);
      setNewDish({
        name: '',
        description: '',
        price: '',
        image_url: '',
        is_available: true,
      });
      setSelectedCategory(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleDishAvailability = async (dishId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/dishes/${dishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dish');
      }

      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Menu</h1>
          <p className="text-slate-500 mt-1">Manage categories and dishes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
                <DialogDescription>Add a new category to organize your dishes</DialogDescription>
              </DialogHeader>
              <div>
                <Label htmlFor="categoryName">Category Name</Label>
                <Input
                  id="categoryName"
                  placeholder="e.g., Appetizers, Main Course"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ name: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button onClick={createCategory}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No categories yet. Add your first category to start building your menu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.name}</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setDishDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dish
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {category.dishes.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No dishes in this category</p>
                ) : (
                  <div className="space-y-4">
                    {category.dishes.map((dish) => (
                      <div key={dish.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        {dish.image_url && (
                          <img src={dish.image_url} alt={dish.name} className="w-20 h-20 object-cover rounded" />
                        )}
                        {!dish.image_url && restaurant && PLAN_LIMITS[restaurant.subscription_plan].allowImages && (
                          <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{dish.name}</h4>
                          {dish.description && (
                            <p className="text-sm text-slate-500">{dish.description}</p>
                          )}
                          <p className="text-sm font-semibold mt-1">₹ {dish.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dish.is_available}
                            onCheckedChange={() => toggleDishAvailability(dish.id, dish.is_available)}
                          />
                          <span className="text-sm text-slate-500">
                            {dish.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dishDialogOpen} onOpenChange={setDishDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Dish</DialogTitle>
            <DialogDescription>Create a new dish for your menu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dishName">Dish Name</Label>
              <Input
                id="dishName"
                placeholder="e.g., Margherita Pizza"
                value={newDish.name}
                onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the dish"
                value={newDish.description}
                onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newDish.price}
                onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
              />
            </div>
            {restaurant && PLAN_LIMITS[restaurant.subscription_plan].allowImages && (
              <div>
                <Label htmlFor="image">Dish Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <span className="text-sm text-slate-500">Uploading...</span>}
                </div>
                {newDish.image_url && (
                  <img src={newDish.image_url} alt="Preview" className="w-32 h-32 object-cover rounded mt-2" />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={createDish}>Add Dish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
