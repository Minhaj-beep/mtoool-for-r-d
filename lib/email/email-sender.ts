export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('Sending email:', {
      to: options.to,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function getSubscriptionReminderEmail(
  restaurantName: string,
  daysRemaining: number,
  expiryDate: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Subscription Reminder</h1>
        </div>
        <div class="content">
          <h2>Hello ${restaurantName},</h2>
          <p>This is a friendly reminder that your QR Menu subscription is expiring soon.</p>

          <div class="warning-box">
            <strong>⏰ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining</strong><br>
            Your subscription will expire on <strong>${expiryDate}</strong>
          </div>

          <p>To ensure uninterrupted service and keep your digital menu accessible to your customers, please renew your subscription before the expiry date.</p>

          <h3>What happens if my subscription expires?</h3>
          <ul>
            <li>Your digital menu will no longer be accessible to customers</li>
            <li>You won't be able to add or edit menu items</li>
            <li>Your QR code will display a service unavailable message</li>
          </ul>

          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/subscription" class="button">
              Renew Subscription
            </a>
          </center>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

          <p>Best regards,<br>The QR Menu Team</p>
        </div>
        <div class="footer">
          <p>You're receiving this email because you have an active QR Menu account.</p>
        </div>
      </body>
    </html>
  `;
}

export function getSubscriptionExpiredEmail(
  restaurantName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #ef4444;
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .alert-box {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">⚠️ Subscription Expired</h1>
        </div>
        <div class="content">
          <h2>Hello ${restaurantName},</h2>
          <p>Your QR Menu subscription has expired.</p>

          <div class="alert-box">
            <strong>Service Suspended</strong><br>
            Your digital menu is no longer accessible to customers.
          </div>

          <p>To restore access to your digital menu and resume service, please renew your subscription.</p>

          <h3>Current Limitations:</h3>
          <ul>
            <li>❌ Digital menu is not accessible to customers</li>
            <li>❌ Cannot add or edit menu items</li>
            <li>❌ QR code shows service unavailable message</li>
          </ul>

          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/subscription" class="button">
              Renew Now
            </a>
          </center>

          <p>Your data is safe and will be restored immediately upon renewal.</p>

          <p>If you have any questions, please contact our support team.</p>

          <p>Best regards,<br>The QR Menu Team</p>
        </div>
        <div class="footer">
          <p>You're receiving this email because you have a QR Menu account.</p>
        </div>
      </body>
    </html>
  `;
}
