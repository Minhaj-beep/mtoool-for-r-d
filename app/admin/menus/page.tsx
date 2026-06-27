'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

import { supabaseBrowser } from '@/lib/supabase/browser';

import {
  Plus,
  Trash2,
  ChevronRight,
  FolderOpen,
  GripVertical,
  Pencil,
} from 'lucide-react';

import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type MenuCategory = {
  id: string;
  name: string;
  is_active: boolean;
  dishes_count: number;
};

/* -------------------------------------------------------------------------- */
/* SORTABLE ITEM */
/* -------------------------------------------------------------------------- */

function SortableCategory({
  category,
  children,
}: {
  category: MenuCategory;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex gap-3 items-start">
        {/* Larger touch drag handle */}
        <div
          {...listeners}
          {...attributes}
          className="
            flex items-center justify-center
            min-w-[44px]
            min-h-[44px]
            cursor-grab
            active:cursor-grabbing
            text-slate-400
            hover:text-slate-600
            touch-none
          "
        >
          <GripVertical size={20} />
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE */
/* -------------------------------------------------------------------------- */

export default function MenuCategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [editingCategory, setEditingCategory] =
    useState<MenuCategory | null>(null);

  const [editName, setEditName] = useState('');

  /* -------------------------------------------------------------------------- */
  /* MOBILE FRIENDLY DRAG SENSOR */
  /* -------------------------------------------------------------------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // prevents accidental drag while scrolling
      },
    })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  /* -------------------------------------------------------------------------- */
  /* LOAD */
/* -------------------------------------------------------------------------- */

  const loadCategories = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) return;

      const { data: restaurant } = await supabaseBrowser
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) throw new Error('Restaurant not found');

      setRestaurantId(restaurant.id);

      const { data, error } = await supabaseBrowser
        .from('menu_categories')
        .select(`
          id,
          name,
          is_active,
          dishes ( count )
        `)
        .eq('restaurant_id', restaurant.id)
        .order('display_order');

      if (error) throw error;

      setCategories(
        data.map((c: any) => ({
          id: c.id,
          name: c.name,
          is_active: c.is_active,
          dishes_count: c.dishes?.[0]?.count ?? 0,
        }))
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CREATE */
/* -------------------------------------------------------------------------- */

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name required');
      return;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          name: newCategoryName,
          restaurant_id: restaurantId,
          display_order: categories.length,
          is_active: true,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success('Created');

      setDialogOpen(false);
      setNewCategoryName('');

      loadCategories();
    } catch {
      toast.error('Create failed');
    }
  };

  /* -------------------------------------------------------------------------- */
  /* UPDATE NAME */
/* -------------------------------------------------------------------------- */

  const updateCategoryName = async () => {
    if (!editingCategory) return;

    try {
      await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          name: editName,
        }),
      });

      toast.success('Updated');

      setEditingCategory(null);

      loadCategories();
    } catch {
      toast.error('Update failed');
    }
  };

  /* -------------------------------------------------------------------------- */
  /* TOGGLE */
/* -------------------------------------------------------------------------- */

  const toggleCategoryActive = async (
    id: string,
    current: boolean
  ) => {
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          is_active: !current,
        }),
      });

      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, is_active: !current }
            : c
        )
      );
    } catch {
      toast.error('Failed');
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DELETE */
/* -------------------------------------------------------------------------- */

  const deleteCategory = async (category: MenuCategory) => {
    if (category.is_active) {
      toast.error('Deactivate first');
      return;
    }

    if (!confirm('Delete category?')) return;

    try {
      await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      toast.success('Deleted');

      setCategories((prev) =>
        prev.filter((c) => c.id !== category.id)
      );
    } catch {
      toast.error('Delete failed');
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DRAG */
/* -------------------------------------------------------------------------- */

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(
      (c) => c.id === active.id
    );

    const newIndex = categories.findIndex(
      (c) => c.id === over.id
    );

    const reordered = arrayMove(
      categories,
      oldIndex,
      newIndex
    );

    setCategories(reordered);

    await Promise.all(
      reordered.map((cat, index) =>
        supabaseBrowser
          .from('menu_categories')
          .update({
            display_order: index,
          })
          .eq('id', cat.id)
      )
    );
  };

  /* -------------------------------------------------------------------------- */
  /* LOADING */
/* -------------------------------------------------------------------------- */

  if (loading)
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );

  /* -------------------------------------------------------------------------- */
  /* UI */
/* -------------------------------------------------------------------------- */

  return (
    <div className="pb-32">

      {/* MOBILE STICKY HEADER */}

      <div className="
        sticky
        top-0
        z-10
        bg-white
        border-b
        p-4
      ">

        <div className="
          flex
          items-center
          justify-between
          gap-2
        ">

          <div>
            <h1 className="
              text-xl
              md:text-3xl
              font-bold
            ">
              Categories
            </h1>

            <p className="text-sm text-muted-foreground">
              {categories.length} total
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >

            <DialogTrigger asChild>

              <Button size="sm">

                <Plus size={16} />

              </Button>

            </DialogTrigger>

            <DialogContent className="
              max-w-md
              w-[95%]
              rounded-2xl
            ">

              <DialogHeader>

                <DialogTitle>
                  New Category
                </DialogTitle>

              </DialogHeader>

              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) =>
                  setNewCategoryName(
                    e.target.value
                  )
                }
              />

              <DialogFooter>

                <Button
                  className="w-full"
                  onClick={createCategory}
                >
                  Create
                </Button>

              </DialogFooter>

            </DialogContent>

          </Dialog>

        </div>

      </div>

      {/* EMPTY */}

      {categories.length === 0 && (

        <Card className="m-4 border-dashed">

          <CardContent className="
            py-16
            text-center
          ">

            <FolderOpen className="
              mx-auto
              mb-4
            "/>

            No categories yet

          </CardContent>

        </Card>

      )}

      {/* LIST */}

      <div className="p-4">

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >

          <SortableContext
            items={categories.map(c => c.id)}
            strategy={
              verticalListSortingStrategy
            }
          >

            <div className="space-y-3">

              {categories.map(category => (

                <SortableCategory
                  key={category.id}
                  category={category}
                >

                  <Card className="
                    rounded-xl
                    shadow-sm
                  ">

                    <CardHeader
                      className="
                        space-y-3
                      "
                    >

                      {/* TITLE */}

                      <div>

                        <CardTitle className="
                          text-base
                          md:text-lg
                        ">
                          {category.name}
                        </CardTitle>

                        <CardDescription>
                          {category.dishes_count} dishes
                        </CardDescription>

                      </div>

                      {/* MOBILE BUTTON STACK */}

                      <div className="
                        flex
                        flex-wrap
                        gap-2
                      ">

                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() =>
                            toggleCategoryActive(
                              category.id,
                              category.is_active
                            )
                          }
                        />

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(category);
                            setEditName(category.name);
                          }}
                        >
                          <Pencil size={18}/>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() =>
                            deleteCategory(category)
                          }
                        >
                          <Trash2 size={18}/>
                        </Button>

                        {restaurantId && (

                          <Link
                            href={`/admin/restaurants/${restaurantId}/${category.id}`}
                            className="flex-1"
                          >

                            <Button
                              variant="outline"
                              className="
                                w-full
                              "
                            >

                              Edit items

                              <ChevronRight
                                size={16}
                              />

                            </Button>

                          </Link>

                        )}

                      </div>

                    </CardHeader>

                  </Card>

                </SortableCategory>

              ))}

            </div>

          </SortableContext>

        </DndContext>

      </div>

      {/* EDIT DIALOG */}

      <Dialog
        open={!!editingCategory}
        onOpenChange={() =>
          setEditingCategory(null)
        }
      >

        <DialogContent className="
          max-w-md
          w-[95%]
        ">

          <DialogHeader>

            <DialogTitle>
              Edit Category
            </DialogTitle>

          </DialogHeader>

          <Input
            value={editName}
            onChange={(e) =>
              setEditName(e.target.value)
            }
          />

          <DialogFooter>

            <Button
              className="w-full"
              onClick={updateCategoryName}
            >
              Save
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}
