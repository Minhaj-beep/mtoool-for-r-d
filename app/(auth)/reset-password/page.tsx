'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success('Password updated successfully');

      router.push('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">

        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">

            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>

          </form>
        </CardContent>

      </Card>
    </div>
  );
}
