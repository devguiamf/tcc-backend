# Email Service Configuration Guide

## Overview

The application uses Nodemailer to send emails for password reset functionality. The email service can be configured to use various SMTP providers.

## Configuration Variables

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_ENABLED=true                    # Set to 'false' to disable email sending (logs only)
EMAIL_HOST=smtp.gmail.com             # SMTP server host
EMAIL_PORT=587                         # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                     # true for SSL (port 465), false for TLS (port 587)
EMAIL_USER=your-email@gmail.com       # SMTP username
EMAIL_PASSWORD=your-app-password       # SMTP password or app password
EMAIL_FROM=noreply@yourapp.com        # Email address that appears as sender
```

## Setup Examples

### Gmail

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Generate a new app password for "Mail"
3. **Configure `.env`**:
   ```env
   EMAIL_ENABLED=true
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

### Outlook/Hotmail

```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=your-email@outlook.com
```

### SendGrid

```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourapp.com
```

### AWS SES

```env
EMAIL_ENABLED=true
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-aws-smtp-username
EMAIL_PASSWORD=your-aws-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

### Mailtrap (Development/Testing)

Mailtrap is great for development as it captures emails without sending them:

1. Sign up at https://mailtrap.io
2. Create an inbox
3. Copy SMTP credentials
4. Configure `.env`:
   ```env
   EMAIL_ENABLED=true
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_SECURE=false
   EMAIL_USER=your-mailtrap-username
   EMAIL_PASSWORD=your-mailtrap-password
   EMAIL_FROM=noreply@yourapp.com
   ```

## Disable Email (Development Mode)

For development, you can disable actual email sending and just log emails:

```env
EMAIL_ENABLED=false
```

When disabled, emails will be logged to the console but not actually sent.

## Testing

1. Ensure all email variables are set in `.env`
2. Start the application:
   ```bash
   npm run start:dev
   ```
3. Test the password reset endpoint:
   ```bash
   POST /auth/request-password-reset
   {
     "email": "test@example.com"
   }
   ```
4. Check the logs for email sending confirmation
5. Verify the email was received (check spam folder)

## Troubleshooting

### "Access denied" error
- Check if 2FA is enabled (for Gmail)
- Verify you're using an App Password, not your regular password
- Ensure the password doesn't have spaces

### Connection timeout
- Check firewall settings
- Verify the SMTP host and port are correct
- Try different ports (587 for TLS, 465 for SSL)

### Emails going to spam
- Use a verified sender email address
- Add SPF/DKIM records for your domain (for production)
- Avoid using generic email providers for production

### Email service disabled
- Check `EMAIL_ENABLED` is set to `true`
- Verify all required variables (HOST, USER, PASSWORD) are set
- Check application logs for configuration warnings

