# Deployment Guide - QR Menu SaaS Platform

## Quick Start

This application is production-ready and can be deployed in under 30 minutes.

## Prerequisites

1. **Supabase Account** (Free tier available)
2. **AWS Account** (For S3 storage)
3. **Stripe Account** (For payments)
4. **Vercel/Netlify Account** (For hosting)

## Step-by-Step Deployment

### 1. Database Setup (Supabase)

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Run Migrations
The database migration has already been created in your Supabase dashboard. It includes:
- All table structures
- Row Level Security policies
- Indexes for performance
- Foreign key relationships

Your database is ready to use immediately!

### 2. AWS S3 Setup

#### Create S3 Bucket
```bash
# Via AWS CLI or AWS Console
aws s3 mb s3://your-qr-menu-images
```

#### Configure CORS
Add this CORS configuration to your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "ExposeHeaders": []
  }
]
```

#### Create IAM User
1. Create IAM user with S3 access
2. Attach policy: `AmazonS3FullAccess` (or create custom policy)
3. Generate access key and secret

### 3. Stripe Setup

#### Create Stripe Products
1. Go to Stripe Dashboard
2. Create products for each plan:
   - **Basic Plan**: $29/month
   - **Pro Plan**: $79/month
   - **Enterprise Plan**: $199/month

3. Note the Price IDs for each product
4. Get your API keys from Dashboard > Developers > API keys

#### Configure Webhook (Optional for production)
1. Create webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
2. Select events: `checkout.session.completed`, `customer.subscription.updated`
3. Copy webhook secret

### 4. Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-qr-menu-images

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 5. Deploy to Vercel

#### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

#### Option 2: GitHub Integration
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### 6. Deploy to Netlify (Alternative)

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Post-Deployment Checklist

### 1. Test Authentication
- [ ] Sign up a new restaurant
- [ ] Log in successfully
- [ ] Verify user appears in Supabase dashboard

### 2. Test Menu Creation
- [ ] Create a menu
- [ ] Add categories
- [ ] Add dishes
- [ ] Verify RLS policies work (can't see other restaurants' data)

### 3. Test Image Upload
- [ ] Upload a dish image
- [ ] Verify image appears in S3
- [ ] Verify image loads on public menu
- [ ] Test plan limits for images

### 4. Test QR Code
- [ ] Generate QR code
- [ ] Download QR code
- [ ] Scan with phone
- [ ] Verify public menu loads

### 5. Test Subscription Flow
- [ ] View subscription plans
- [ ] Click upgrade
- [ ] Complete Stripe checkout (use test mode)
- [ ] Verify plan updates in database

### 6. Test Public Menu
- [ ] Access via QR code
- [ ] Verify mobile responsiveness
- [ ] Test Google review button (if configured)
- [ ] Verify watermark shows for free plan
- [ ] Verify dish images load (for paid plans)

## Performance Optimization

### 1. Enable Caching
Add these headers to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/menu/:slug',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      ],
    },
  ];
}
```

### 2. Image Optimization
S3 images are already optimized via:
- Lazy loading on public menus
- Proper sizing (thumbnails recommended)
- CDN distribution through S3

### 3. Database Optimization
Already implemented:
- Indexes on all foreign keys
- Efficient RLS policies
- Proper query structure

## Monitoring & Maintenance

### 1. Set Up Error Tracking
Recommended: Sentry integration

```bash
npm install @sentry/nextjs
```

### 2. Monitor Performance
- Vercel Analytics (built-in)
- Stripe Dashboard for payments
- Supabase Dashboard for database

### 3. Regular Updates
```bash
npm update
npm audit fix
```

## Security Checklist

- [ ] All environment variables configured
- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] RLS policies tested and verified
- [ ] S3 bucket not publicly accessible
- [ ] Stripe webhook secret configured
- [ ] API rate limiting configured (via Vercel/Netlify)

## Scaling Considerations

### Database
- Supabase Pro plan for larger loads
- Connection pooling (built-in)
- Read replicas for high traffic

### Storage
- S3 + CloudFront for global CDN
- Image optimization service
- Lazy loading implemented

### Hosting
- Vercel Pro for higher limits
- Edge functions for global performance
- Automatic scaling built-in

## Troubleshooting

### Database Connection Issues
```bash
# Verify Supabase credentials
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

### S3 Upload Fails
- Check IAM permissions
- Verify CORS configuration
- Check bucket name in .env

### Stripe Checkout Not Working
- Verify API keys (test vs live)
- Check webhook configuration
- Review Stripe logs

### QR Code Not Loading
- Verify restaurant slug is correct
- Check public menu RLS policies
- Ensure menu is marked as active

## Support Resources

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- AWS S3 Docs: https://docs.aws.amazon.com/s3/

## Production Checklist

Before going live:
- [ ] Environment variables configured for production
- [ ] Stripe in live mode (not test mode)
- [ ] S3 bucket in production region
- [ ] Domain configured and SSL enabled
- [ ] Error tracking enabled
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Terms of Service and Privacy Policy added
- [ ] Support email configured
- [ ] Test all user flows
- [ ] Load testing completed

## Next Steps

1. Configure your custom domain
2. Set up email notifications
3. Create help documentation for users
4. Launch marketing site
5. Monitor user feedback and iterate

Your QR Menu SaaS platform is now ready for production use!
