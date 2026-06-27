# QR Menu - Multi-Tenant Restaurant Digital Menu Platform

A production-ready SaaS platform for restaurants to manage QR-code-based digital menus with subscription-based features.

## Overview

QR Menu is a comprehensive multi-tenant application that enables restaurants to:
- Create and manage digital menus accessible via QR codes
- Accept payments through Stripe subscriptions
- Upload dish images to AWS S3
- Enable Google review integration
- Implement feature gating based on subscription plans

## Tech Stack

- **Frontend**: Next.js 13 (React)
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (Email/Password)
- **Storage**: AWS S3 (Dish Images)
- **Payments**: Stripe (Subscriptions)
- **QR Generation**: qrcode library

## Architecture

### Multi-Tenant Design
- Complete data isolation between restaurants
- Row Level Security (RLS) policies on all tables
- Each restaurant has its own admin users and data

### Subscription Plans

#### FREE
- 1 menu only
- Max 3 categories
- Max 10 dishes
- NO dish photos
- Platform watermark shown
- Google review button DISABLED

#### BASIC ($29/month)
- 1 active menu
- Up to 10 categories
- Up to 50 dishes
- Dish photos (50 images)
- Google review button enabled
- No watermark

#### PRO ($79/month)
- Multiple menus
- Unlimited categories
- Unlimited dishes
- Dish photos (300 images)
- Custom branding
- Menu analytics

#### ENTERPRISE ($199/month)
- Multiple restaurant branches
- Unlimited everything
- Custom domain support
- White-label
- Advanced analytics

## Database Schema

### Tables
- `restaurants` - Restaurant information and subscription status
- `users` - Admin users linked to restaurants
- `menus` - Restaurant menus
- `categories` - Menu categories
- `dishes` - Individual dishes with pricing and images

### Security
All tables have RLS enabled with proper policies ensuring:
- Admins can only access their restaurant's data
- Public users can view active menus
- Complete multi-tenant isolation

## Setup Instructions

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_region
S3_BUCKET_NAME=your_bucket

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

The database schema is automatically created via Supabase migrations. The migration includes:
- All table definitions
- Indexes for performance
- RLS policies for security
- Foreign key constraints

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Key Features

### Admin Dashboard
- **Authentication**: Secure login/signup for restaurant admins
- **Dashboard**: Overview of menus, categories, and dishes
- **Menu Management**: Create and manage multiple menus
- **Category Management**: Organize dishes by categories
- **Dish Management**: Add dishes with descriptions, prices, and images
- **Image Upload**: Direct S3 upload with pre-signed URLs
- **QR Code Generation**: Generate and download QR codes
- **Settings**: Manage restaurant profile and Google Place ID
- **Subscription**: View current plan and upgrade options

### Public Menu Page
- **Mobile-First Design**: Optimized for phone scanning
- **Fast Loading**: Lazy-loaded images, optimized queries
- **Category Organization**: Clear menu structure
- **Dish Display**: Name, description, price, and images
- **Google Review Button**: Direct link (if enabled by plan)
- **Branded Experience**: Custom colors and logos (Pro+)

### Feature Gating
Feature access is controlled by subscription plan:
- Menu/category/dish limits enforced
- Image upload restricted by plan
- Google review button gated
- Watermark removal controlled
- Custom branding for Pro+ plans

## API Routes

### Authentication
- `POST /api/auth/signup` - Create new restaurant account
- `POST /api/auth/login` - Admin login

### Restaurant
- `GET /api/restaurant` - Get restaurant details
- `PUT /api/restaurant` - Update restaurant settings

### Menus
- `GET /api/menus` - List all menus
- `POST /api/menus` - Create new menu
- `PUT /api/menus/[id]` - Update menu
- `DELETE /api/menus/[id]` - Delete menu

### Categories
- `GET /api/categories?menuId=X` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Dishes
- `GET /api/dishes?categoryId=X` - List dishes
- `POST /api/dishes` - Create dish
- `PUT /api/dishes/[id]` - Update dish
- `DELETE /api/dishes/[id]` - Delete dish

### S3 Upload
- `POST /api/upload/presigned-url` - Get pre-signed upload URL

### QR Code
- `POST /api/qr/generate` - Generate QR code for menu

### Stripe
- `POST /api/stripe/create-checkout` - Create Stripe checkout session

## S3 Image Upload Flow

1. Admin requests pre-signed URL from backend
2. Backend checks plan limits and image count
3. Backend generates pre-signed URL for direct S3 upload
4. Frontend uploads image directly to S3
5. Frontend saves S3 URL in database
6. Image count incremented for plan limit tracking

## Security Features

- **Multi-tenant Isolation**: RLS policies prevent cross-restaurant data access
- **Secure Authentication**: Supabase auth with bcrypt password hashing
- **S3 Pre-signed URLs**: Images uploaded without exposing AWS credentials
- **API Protection**: All admin routes check authentication
- **Input Validation**: Zod schemas for API requests
- **SQL Injection Prevention**: Parameterized queries via Supabase client

## Scalability

### Design Principles
- **Stateless Backend**: All API routes are serverless functions
- **Read-Heavy Optimization**: Public menus cached at CDN level
- **Efficient Queries**: Proper indexes on all foreign keys
- **Lazy Loading**: Images loaded on-demand
- **Connection Pooling**: Supabase handles connection management

### Performance
- Sub-second menu load times
- Optimized for mobile QR scanning
- Minimal bundle size for public pages
- Efficient database queries with proper indexes

## Production Deployment

### Checklist
1. Set up Supabase project
2. Run database migrations
3. Configure AWS S3 bucket with CORS
4. Set up Stripe account and products
5. Configure environment variables
6. Deploy to Vercel/Netlify
7. Set up custom domain (Enterprise plan)
8. Configure CDN caching

### Monitoring
- Track subscription metrics
- Monitor API response times
- Set up error logging
- Track QR scan analytics (Pro+)

## Future Enhancements

- Multi-language menu support
- Menu scheduling (breakfast/lunch/dinner)
- Allergen and dietary information
- Table ordering integration
- Advanced analytics dashboard
- Mobile app for admins
- Webhook notifications
- API access for integrations

## Support

For issues or questions:
1. Check the documentation
2. Review API error messages
3. Verify environment variables
4. Check Supabase logs
5. Contact support (Enterprise plan)

## License

Proprietary - All rights reserved
# mtool-menu
