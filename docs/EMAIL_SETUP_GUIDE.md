# Email Setup Guide - Nodemailer with Gmail

## ✅ What's Been Done

GetFit server now has email verification using **Nodemailer with Gmail**. This checks if emails are real and sends verification emails on registration.

## 📋 Setup Steps

### 1. Get a Gmail App Password

**Important:** You cannot use your regular Gmail password. You need to create an **App Password**.

**Steps:**
1. Go to your Google Account settings: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "How you sign in to Google", enable **2-Step Verification** (if not already enabled)
4. After 2-Step is enabled, go back to Security
5. Under "How you sign in to Google", click **App passwords**
6. Create a new app password:
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → Type "GetFit App"
7. Click **Generate**
8. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### 2. Update Your .env File

Open `server/.env` and update these lines:

```env
EMAIL_USER="your-actual-gmail@gmail.com"
EMAIL_PASSWORD="abcdefghijklmnop"  # The 16-character app password (no spaces)
APP_URL="http://localhost:3000"
```

**Example:**
```env
EMAIL_USER="john.doe@gmail.com"
EMAIL_PASSWORD="xyzw1234abcd5678"
APP_URL="http://localhost:3000"
```

### 3. Run Database Migration

In the server terminal, run:
```bash
npx prisma migrate dev --name add_email_verification
```

When prompted "Are you sure you want to create this migration?", type **y** and press Enter.

### 4. Test Registration

1. Start your server: `npm run dev` or `npm start`
2. Register a new user with a **real email address** (yours for testing)
3. Check your email inbox (and spam folder) for the verification email
4. Click the verification link or use the token

## 🔧 How It Works

### Registration Flow:
1. User registers with email and password
2. Server creates user account with `isEmailVerified: false`
3. Generates a unique verification token (expires in 24 hours)
4. Sends verification email to user's address
5. User clicks link or enters token
6. Server marks email as verified and sends welcome email

### Email Verification:
- Tokens expire after **24 hours**
- After verification, user receives a welcome email
- User can login before verification, but you can add frontend logic to enforce verification

## 📧 API Endpoints

### Registration
**POST** `/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@gmail.com",
  "password": "password123",
  "phone": "1234567890"  // optional
}
```

Response includes `isEmailVerified: false` and message to check email.

### Email Verification
**POST** `/auth/verify-email`
```json
{
  "token": "verification_token_from_email"
}
```

### Login
**POST** `/auth/login`
- Works even if email is not verified
- Returns user info including `isEmailVerified` status

## 📱 Frontend Integration Needed

You'll need to add to your frontend:

1. **After registration**: Show message "Please check your email to verify your account"

2. **Email verification screen**: 
   - User enters verification token from email
   - Or handles deep link with token in URL
   - Call `/auth/verify-email` endpoint

3. **Optional**: Add verification check before allowing app access

## 🧪 Testing

### Test with Real Email:
```javascript
// Register
POST http://localhost:3000/auth/register
{
  "name": "Test User",
  "email": "your-real-email@gmail.com",
  "password": "test123"
}

// Check your email inbox
// Copy verification link or token

// Verify
POST http://localhost:3000/auth/verify-email
{
  "token": "copied_token_here"
}
```

## 🎯 Features Implemented

- ✅ Email verification on registration
- ✅ Verification tokens with 24-hour expiry
- ✅ Welcome email after verification
- ✅ Ready for trainer invite emails
- ✅ All emails use professional HTML templates

## 📝 Database Schema

The `User` table now has:
- `isEmailVerified` (Boolean) - default: false
- `emailVerificationToken` (String) - unique token
- `emailVerificationExpires` (DateTime) - expiration timestamp

## 🔒 Security

- Tokens are cryptographically secure (32 bytes random)
- Tokens expire after 24 hours
- Tokens are deleted after successful verification
- Failed verifications don't reveal if email exists
- Gmail App Passwords are more secure than regular passwords

## ⚠️ Important Notes

1. **Use App Password, NOT your regular Gmail password**
2. **Test with a real email address** (your own for testing)
3. **Check spam folder** if verification email doesn't arrive
4. **Gmail free account limit:** 500 emails/day
5. For production, consider using a professional email service

## 🚨 Troubleshooting

### "Failed to send verification email"
- Check `EMAIL_USER` is a valid Gmail address
- Check `EMAIL_PASSWORD` is the 16-character App Password (no spaces)
- Make sure 2-Step Verification is enabled on your Google account
- Try regenerating the App Password

### Email not received
1. Check spam/junk folder
2. Wait a few minutes (can take 1-5 minutes)
3. Check server logs for email sending errors
4. Verify Gmail credentials are correct

### "Verification token has expired"
- Tokens expire after 24 hours
- User needs to register again to get a new token
- (Future: add "resend verification email" feature)

### "Invalid verification token"
- Token might be wrong or already used
- Check if email was already verified
- Try registering again

## 🎨 Email Templates

All emails are styled with professional HTML. You can customize templates in:
`server/src/services/emailService.js`

### Emails sent:
1. **Verification Email** - On registration
2. **Welcome Email** - After email verified
3. **Trainer Invite Email** - When trainer invites trainee (ready to use)


---

**Need help?** Check Nodemailer docs: https://nodemailer.com/about/
