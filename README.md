# Shukin Pay

A payment collection management application for events. Supports PayPay and bank transfer payments.

## Features

- Event-based payment management
- PayPay payment integration
- Bank transfer support
- Email authentication for payment users
- Conditional pricing (radio buttons and checkboxes)
- Gmail OAuth for email sending
- Admin dashboard for payment tracking

## Prerequisites

- Node.js 18+
- Yarn
- Turso Database Account
- Google Cloud Console Account (for Gmail OAuth)
- PayPay for Developers Account

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd shukin-pay
yarn install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Obtaining Credentials](#obtaining-credentials) below).

### 3. Setup Database

```bash
npx ts-node scripts/setup-db.ts
```

### 4. Create Admin User

```bash
npx ts-node scripts/seed-admin.ts
```

Default credentials: `admin@example.com` / `password123`

### 5. Run Development Server

```bash
yarn dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Obtaining Credentials

### Turso Database

1. Install Turso CLI:
   ```bash
   # macOS
   brew install tursodatabase/tap/turso

   # Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Login and create database:
   ```bash
   turso auth login
   turso db create shukin-pay
   ```

3. Get credentials:
   ```bash
   # Get database URL
   turso db show shukin-pay --url

   # Get auth token
   turso db tokens create shukin-pay
   ```

4. For local development, you can use SQLite:
   ```
   TURSO_DATABASE_URL=file:local.db
   ```

### Gmail OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select existing one

3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `gmail.send`, `userinfo.email`
   - Add your email as a test user

5. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URI:
     - Local: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://your-domain.com/api/auth/google/callback`

6. Copy Client ID and Client Secret to your `.env` file

### PayPay for Developers

1. Sign up at [PayPay for Developers](https://developer.paypay.ne.jp/)

2. Create a new application

3. Get your API credentials from the dashboard:
   - API Key
   - API Secret
   - Merchant ID

4. For testing, use sandbox environment:
   ```
   PAYPAY_ENV=sandbox
   ```

5. Configure Webhook URL in PayPay dashboard:
   ```
   https://your-domain.com/api/webhooks/paypay
   ```

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables in project settings
5. Deploy

### 3. Post-Deployment Setup

1. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain
2. Update `GMAIL_REDIRECT_URI` to include your domain
3. Update PayPay Webhook URL in PayPay dashboard
4. Run database setup:
   ```bash
   npx ts-node scripts/setup-db.ts
   npx ts-node scripts/seed-admin.ts
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database URL | Yes |
| `TURSO_AUTH_TOKEN` | Turso auth token | Yes (production) |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `NEXT_PUBLIC_APP_LOCALE` | App locale (ja or en) | Yes |
| `GMAIL_CLIENT_ID` | Google OAuth client ID | Yes |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GMAIL_REDIRECT_URI` | OAuth redirect URI | Yes |
| `PAYPAY_ENV` | `sandbox` or `production` | No (default: sandbox) |

## Usage

### Admin Panel

1. Login at `/admin/login`
2. Create payment configurations (PayPay or Bank Transfer)
3. Create events with pricing conditions
4. Share payment links with users
5. Track payment status in dashboard

### Payment Flow (Users)

1. Access payment link
2. Enter email address
3. Verify email (click link in email)
4. Select conditions and payment method
5. Complete payment via PayPay or bank transfer

## License

MIT
