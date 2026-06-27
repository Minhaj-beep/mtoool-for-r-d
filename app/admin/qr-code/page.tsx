// UI CHANGE: Enhanced QR code page with better card styling, improved CTAs, and visual hierarchy
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { Download, QrCode, Link as LinkIcon, Check, Sparkles } from 'lucide-react';

export default function QRCodePage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [menuUrl, setMenuUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateQR();
  }, []);

  const generateQR = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setQrCode(data.qrCode);
      setMenuUrl(data.menuUrl);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'menu-qr-code.png';
    link.click();
    toast.success('QR code downloaded');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast.success('Menu URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">QR Code</h1>
        <p className="text-slate-600 mt-2 text-base">Download and share your menu QR code</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Your Menu QR Code
            </CardTitle>
            <CardDescription className="text-base">
              Customers scan this to view your digital menu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {qrCode && (
              <div className="flex flex-col items-center gap-6">
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                  <img src={qrCode} alt="Menu QR Code" className="w-64 h-64" />
                </div>
                <Button onClick={downloadQR} size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all">
                  <Download className="w-5 h-5 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu URL & Tips Card */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Menu URL
              </CardTitle>
              <CardDescription className="text-base">
                Share this link directly with your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={menuUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
                <Button onClick={copyUrl} variant={copied ? "default" : "outline"} className="flex-shrink-0">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    'Copy'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-700" />
                Tips for Best Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Print and place on tables, counters, or at the entrance</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Include in promotional materials and flyers</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Share on social media and your website</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Test the QR code before printing to ensure it works</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
