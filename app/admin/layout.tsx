// UI CHANGE: Improved admin layout with better spacing, typography, and responsive design
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard,
  MenuSquare,
  Settings,
  QrCode,
  CreditCard,
  LogOut,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);


  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Menus', href: '/admin/menus', icon: MenuSquare },
    { name: 'QR Code', href: '/admin/qr-code', icon: QrCode },
    { name: 'Subscription', href: '/admin/subscription', icon: CreditCard },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-300 ease-in-out shadow-xl md:shadow-none`}>
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">mtoool menu</h1>
                {/* <p className="text-xs text-slate-500 mt-0.5">Admin Dashboard</p> */}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-200 mt-auto absolute bottom-0 left-0 right-0 bg-white">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden"
            >
              <MenuIcon className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold md:hidden">mtoool menu</h1>
            <div className="hidden md:block"></div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
