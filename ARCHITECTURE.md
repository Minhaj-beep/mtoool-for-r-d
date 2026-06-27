# System Architecture - QR Menu SaaS Platform

## Overview

QR Menu is a production-ready, multi-tenant SaaS platform designed to scale from 1 to 10,000+ restaurants. The architecture prioritizes security, performance, and maintainability.

## Architecture Principles

### 1. Multi-Tenancy
- **Complete Data Isolation**: Each restaurant's data is isolated via Row Level Security (RLS)
- **Shared Infrastructure**: All tenants share the same application and database
- **Per-Tenant Metrics**: Track usage and enforce limits by restaurant

### 2. Stateless Design
- **No Server State**: All API routes are stateless serverless functions
- **Session Management**: Handled by Supabase Auth with JWT tokens
- **Horizontal Scaling**: Can scale infinitely without coordination

### 3. Security First
- **RLS Everywhere**: Database-level security on all tables
- **Authentication Required**: All admin operations require valid JWT
- **No Direct File Uploads**: Images uploaded to S3 via pre-signed URLs
- **Input Validation**: All API inputs validated with Zod schemas

## Technology Stack

### Frontend Layer
```
Next.js 13 (App Router)
├── React 18 (UI Components)
├── TailwindCSS (Styling)
├── shadcn/ui (Component Library)
└── Lucide React (Icons)
```

**Why Next.js?**
- Server-side rendering for SEO
- API routes for backend logic
- Automatic code splitting
- Built-in optimization
- Edge function support

### Backend Layer
```
Next.js API Routes (Serverless)
├── Authentication (Supabase Auth)
├── Business Logic (TypeScript)
├── Data Access (Supabase Client)
└── External Services (AWS S3, Stripe)
```

**Why Serverless?**
- No server management
- Automatic scaling
- Pay-per-use pricing
- Global edge deployment
- Zero cold starts with proper warming

### Data Layer
```
PostgreSQL (Supabase)
├── Tables (Restaurants, Users, Menus, Categories, Dishes)
├── RLS Policies (Multi-tenant isolation)
├── Indexes (Performance optimization)
└── Triggers (Automatic timestamps)
```

**Why PostgreSQL?**
- ACID compliance
- Complex queries support
- Row Level Security
- JSON support
- Excellent performance at scale

### Storage Layer
```
AWS S3
├── Dish Images
├── Restaurant Logos
└── Generated QR Codes
```

**Why S3?**
- 99.999999999% durability
- Global CDN integration
- Pre-signed URL support
- Cost-effective at scale
- Industry standard

### Payment Layer
```
Stripe
├── Customer Management
├── Subscription Billing
├── Webhook Handling
└── Payment Processing
```

**Why Stripe?**
- Industry-leading security
- Comprehensive API
- Subscription management
- Global payment support
- Excellent documentation

## Data Model

### Entity Relationship Diagram

```
restaurants (1) ─── (N) users
     │
     │
     │ (1:N)
     │
    menus ─── (N) categories ─── (N) dishes
```

### Key Tables

#### restaurants
- Core tenant identifier
- Subscription plan tracking
- Stripe customer linkage
- Image count for limits

#### users
- Linked to auth.users (Supabase)
- One-to-many with restaurants
- Role-based access (future: multi-user per restaurant)

#### menus
- Belongs to restaurant
- Active/inactive status
- One active menu enforced for Free/Basic plans

#### categories
- Belongs to menu
- Display order for sorting
- Logical grouping of dishes

#### dishes
- Belongs to category
- Price, description, image
- Availability toggle

## Security Architecture

### Authentication Flow
```
1. User submits credentials
2. Supabase Auth validates
3. JWT token issued (1 hour expiry)
4. Token included in all API requests
5. Backend validates token with Supabase
6. RLS policies enforce data access
```

### Row Level Security Policies

#### Restaurant Data
```sql
-- Users can only see their own restaurant
CREATE POLICY "users_own_restaurant"
  ON restaurants FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT restaurant_id FROM users WHERE id = auth.uid()
  ));
```

#### Public Menu Access
```sql
-- Anyone can view active menus
CREATE POLICY "public_menu_access"
  ON menus FOR SELECT
  TO anon
  USING (is_active = true);
```

### Feature Gating

Feature access controlled by `subscription_plan` field:

```typescript
function canUploadImage(plan, imageCount) {
  const limits = PLAN_LIMITS[plan];
  if (!limits.allowImages) return false;
  if (limits.maxImages && imageCount >= limits.maxImages) return false;
  return true;
}
```

## API Architecture

### RESTful Conventions

```
GET    /api/menus           # List all menus
POST   /api/menus           # Create new menu
PUT    /api/menus/[id]      # Update menu
DELETE /api/menus/[id]      # Delete menu
```

### Error Handling

```typescript
try {
  // Business logic
} catch (error) {
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

## Image Upload Flow

### Architecture Decision: Pre-Signed URLs

**Why not direct upload to backend?**
- Backend doesn't handle binary data
- Reduced server load
- Direct client-to-S3 upload
- Better performance
- Lower bandwidth costs

### Upload Sequence

```
1. Frontend requests upload URL
   POST /api/upload/presigned-url
   { fileName, fileType }

2. Backend validates:
   - User authentication
   - Plan limits
   - Image count

3. Backend generates S3 pre-signed URL
   AWS SDK creates temporary upload URL

4. Backend returns URL to frontend
   { uploadUrl, fileUrl }

5. Frontend uploads directly to S3
   PUT to uploadUrl with image file

6. Frontend saves fileUrl to database
   POST /api/dishes with image_url
```

## QR Code System

### Generation
- Server-side generation using `qrcode` library
- Base64 data URL returned to client
- Client can download as PNG

### QR Content
```
https://yourdomain.com/menu/restaurant-slug
```

### Why not dynamic QR?
- Simple implementation
- No tracking overhead
- Permanent QR codes
- Works offline after initial load

## Subscription System

### Stripe Integration

```
1. User clicks "Upgrade"
2. Backend creates/retrieves Stripe customer
3. Backend creates Checkout Session
4. User redirected to Stripe
5. User completes payment
6. Stripe webhook fires
7. Backend updates subscription_plan
8. Features unlock immediately
```

### Plan Enforcement

Enforced at multiple levels:
1. **API Level**: Check before creation
2. **UI Level**: Disable buttons/show upgrade prompts
3. **Database Level**: Constraints on key tables

## Performance Optimizations

### Database Queries
- Indexes on all foreign keys
- Select only needed fields
- Use `maybeSingle()` for optional rows
- Batch operations where possible

### Caching Strategy
```
Public Menus:
- CDN cache: 5 minutes
- Browser cache: 1 minute
- Stale-while-revalidate: 10 minutes

Admin Dashboard:
- No caching (always fresh data)
```

### Image Loading
- Lazy loading on public menus
- Responsive images (future: multiple sizes)
- WebP format support (future)
- Progressive loading

## Scalability

### Current Capacity
- **10,000+ restaurants**: PostgreSQL handles easily
- **100,000+ menu views/day**: Serverless auto-scales
- **1M+ images**: S3 handles unlimited storage

### Bottlenecks & Solutions

#### Database Connections
- **Problem**: Connection pool exhaustion
- **Solution**: Supabase connection pooling (6,000 connections)

#### API Rate Limits
- **Problem**: Abuse or DDoS
- **Solution**: Vercel/Netlify rate limiting (automatic)

#### Image Storage
- **Problem**: S3 costs at scale
- **Solution**: Implement image compression, CDN caching

## Monitoring & Observability

### Key Metrics
1. **Business Metrics**
   - New signups per day
   - Active restaurants
   - Subscription upgrades
   - QR scans (Pro+ feature)

2. **Technical Metrics**
   - API response times
   - Error rates
   - Database query performance
   - Image upload success rate

3. **Infrastructure Metrics**
   - Serverless invocations
   - Database connections
   - S3 bandwidth
   - Stripe API calls

### Logging Strategy
- Error logs to Sentry
- Access logs to Vercel
- Database logs to Supabase
- Payment logs to Stripe

## Disaster Recovery

### Backup Strategy
1. **Database**: Supabase automatic daily backups
2. **Images**: S3 versioning enabled
3. **Code**: Git repository

### Recovery Process
1. Restore database from Supabase backup
2. Redeploy application from Git
3. Verify S3 bucket access
4. Test authentication flow
5. Validate payment processing

## Future Enhancements

### Phase 2 Features
1. **Multi-user Support**
   - Role-based access (owner, manager, staff)
   - Permission system
   - Activity logs

2. **Advanced Analytics**
   - Menu view tracking
   - Popular dish analytics
   - Customer insights

3. **Menu Scheduling**
   - Breakfast/Lunch/Dinner menus
   - Seasonal items
   - Special promotions

4. **Multi-language**
   - Translation system
   - Language detection
   - RTL support

### Technical Improvements
1. **Caching Layer**
   - Redis for session data
   - Edge caching for menus

2. **Background Jobs**
   - Queue for image processing
   - Async notification system

3. **Mobile App**
   - React Native admin app
   - Offline support
   - Push notifications

## Development Guidelines

### Code Organization
```
app/                    # Next.js app directory
├── (auth)/            # Auth pages
├── admin/             # Admin dashboard
├── api/               # API routes
└── menu/              # Public menu pages

lib/                    # Shared libraries
├── auth/              # Auth utilities
├── aws/               # S3 integration
├── stripe/            # Payment logic
├── subscription/      # Plan management
└── types/             # TypeScript types

components/             # React components
└── ui/                # shadcn/ui components
```

### Best Practices
1. Always use TypeScript
2. Implement proper error handling
3. Add input validation
4. Write descriptive variable names
5. Keep functions small and focused
6. Use consistent code style
7. Add JSDoc comments for complex logic

### Testing Strategy (Future)
1. **Unit Tests**: Pure functions
2. **Integration Tests**: API routes
3. **E2E Tests**: Critical user flows
4. **Load Tests**: Performance benchmarks

## Conclusion

This architecture provides a solid foundation for a scalable, secure, and maintainable SaaS platform. The system is designed to grow from a single restaurant to thousands while maintaining performance and security.

Key strengths:
- Multi-tenant by design
- Security at every layer
- Serverless scalability
- Clear separation of concerns
- Production-ready from day one
