# Subscription Notifications System

## Overview
This system automatically monitors subscription expiry dates and sends timely reminders to restaurant owners.

## Components

### 1. Database
- **notifications table**: Stores all notifications with read status tracking
- Supports multiple notification types: reminders, expired, renewed, payment_failed

### 2. API Endpoints
- `GET /api/notifications` - Fetch notifications (with optional unreadOnly filter)
- `PATCH /api/notifications/[id]` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all notifications as read

### 3. UI Components
- **NotificationBell**: Bell icon with unread count badge
- Popover dropdown showing recent notifications
- Click to mark as read functionality

### 4. Edge Function (Scheduled Job)
- **subscription-reminders**: Runs daily to check subscriptions
- Sends reminders at 7, 3, and 1 days before expiry
- Automatically marks subscriptions as expired when due
- Creates in-app notifications for all events

## Scheduling the Edge Function

To run the subscription reminders automatically, you can:

### Option 1: Supabase Cron (Recommended)
Configure in Supabase Dashboard:
1. Go to Database > Extensions
2. Enable pg_cron
3. Add cron job:
```sql
SELECT cron.schedule(
  'subscription-reminders-daily',
  '0 9 * * *', -- Run at 9 AM daily
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-ID].supabase.co/functions/v1/subscription-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [YOUR-ANON-KEY]"}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service
Use services like:
- Cron-job.org
- EasyCron
- GitHub Actions

Configure to call:
```
POST https://[YOUR-PROJECT-ID].supabase.co/functions/v1/subscription-reminders
```

### Option 3: Manual Trigger
For testing or on-demand execution:
```bash
curl -X POST https://[YOUR-PROJECT-ID].supabase.co/functions/v1/subscription-reminders
```

## Email Integration

The email system is abstracted in `/lib/email/email-sender.ts`. To enable email sending:

1. Install an email service (options):
   - Resend
   - SendGrid
   - AWS SES
   - Nodemailer

2. Update `sendEmail()` function with your provider's API

3. Email templates included:
   - `getSubscriptionReminderEmail()` - For 7, 3, 1 day reminders
   - `getSubscriptionExpiredEmail()` - For expired subscriptions

## Notification Types

- **subscription_reminder**: Sent 7, 3, 1 days before expiry
- **subscription_expired**: Sent when subscription expires
- **subscription_renewed**: Sent when subscription is renewed (manual trigger)
- **payment_failed**: Sent when payment fails (manual trigger)

## Testing

### Test Notification Creation
```typescript
// In your code or API route:
await supabase.from('notifications').insert({
  restaurant_id: 'restaurant-uuid',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'general',
});
```

### Test Edge Function
```bash
# Call the function directly
curl -X POST https://[YOUR-PROJECT-ID].supabase.co/functions/v1/subscription-reminders
```

## Monitoring

Check Edge Function logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select subscription-reminders
3. View Logs tab

The function returns a summary:
```json
{
  "success": true,
  "timestamp": "2024-01-10T12:00:00.000Z",
  "results": {
    "reminders": 5,
    "expired": 2,
    "errors": []
  }
}
```
