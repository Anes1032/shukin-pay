# Shukin Pay

A payment collection management application for events. Supports PayPay, Stripe, bank transfer, and cash payments.

## Features

- Event-based payment management
- Multiple payment methods (PayPay, Stripe, Bank Transfer, Cash)
- Email authentication for payment users
- Conditional pricing (radio buttons and checkboxes)
- Gmail OAuth for email sending
- Admin dashboard for payment tracking
- LINE Official Account integration for automated event creation
- LLM-powered event creation from LINE chat history

## Prerequisites

- Node.js 18+
- Yarn
- Turso Database Account
- Google Cloud Console Account (for Gmail OAuth)
- LINE Developers Account (for LINE integration, optional)
- OpenAI API Account (for LLM event creation, optional)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Anes1032/shukin-pay
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
npx ts-node scripts/migration.ts
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

### PayPay (Personal Link)

1. Sign up at [PayPay](https://paypay.ne.jp/)

2. Create a payment link from the PayPay app

3. Copy the payment link URL (format: `https://pay.paypay.ne.jp/...`)

4. Add the link in the admin panel under "決済情報管理" (Payment Info Management)

**Note:** Payment links expire after 14 days. Please update them regularly.

### Stripe

1. Sign up at [Stripe](https://stripe.com/)

2. Create a payment link from the Stripe Dashboard:
   - Go to "Products" > "Payment Links"
   - Create a new payment link
   - Copy the payment link URL (format: `https://buy.stripe.com/...`)

3. Add the link in the admin panel under "決済情報管理" (Payment Info Management)

**Note:** Payment confirmation must be done manually.

### LINE Official Account

1. Sign up at [LINE Developers](https://developers.line.biz/)

2. Create a new provider and channel:
   - Go to "Providers" > "Create"
   - Create a "Messaging API" channel
   - Note your Channel ID

3. Get your credentials:
   - **Channel Access Token**: From the channel's "Messaging API" tab
   - **Channel Secret**: From the channel's "Basic settings" tab
   - **Official Account ID**: From the channel's "Basic settings" tab (without @ symbol)
   - **Official User ID**: From the channel's "Messaging API" tab (for mention detection)

4. Configure Webhook URL:
   - Go to "Messaging API" > "Webhook settings"
   - Set Webhook URL: `https://your-domain.com/api/line/webhook`
   - Enable webhook

5. Enable features:
   - Enable "Linking Accounts" for user-LINE account linking
   - Enable "Auto-reply messages" (optional)

6. Add environment variables to `.env`:
   ```
   LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
   LINE_CHANNEL_SECRET=your_channel_secret
   LINE_OFFICIAL_ACCOUNT_ID=your_official_account_id
   LINE_OFFICIAL_USER_ID=your_official_user_id
   ```

### OpenAI API (for LLM Event Creation)

1. Sign up at [OpenAI](https://platform.openai.com/)

2. Create an API key:
   - Go to "API Keys" > "Create new secret key"
   - Copy the API key

3. Add to `.env`:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

**Note:** The LLM feature uses `gpt-5-mini` model for automatic event creation from LINE chat history.

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
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API channel access token | No (required for LINE integration) |
| `LINE_CHANNEL_SECRET` | LINE Messaging API channel secret | No (required for LINE integration) |
| `LINE_OFFICIAL_ACCOUNT_ID` | LINE official account ID (without @) | No (required for LINE integration) |
| `LINE_OFFICIAL_USER_ID` | LINE official user ID for mention detection | No (required for LINE integration) |
| `OPENAI_API_KEY` | OpenAI API key for LLM event creation | No (required for automatic event creation via LINE) |

## Usage

### Admin Panel

1. Login at `/dashboard` (or `/login`)
2. Configure payment methods:
   - PayPay (personal payment link)
   - Stripe (payment link)
   - Bank Transfer (account information)
   - Cash Payment (always available, no configuration needed)
3. Set default payment methods (used when creating events via LINE)
4. Create events with pricing conditions
5. Share payment links with users
6. Track payment status in dashboard
7. Link LINE Official Account for automated event creation

### Payment Flow (Users)

1. Access payment link
2. Enter email address
3. Verify email (click link in email)
4. Select conditions and payment method
5. Complete payment via PayPay, Stripe, bank transfer, or cash

### LINE Integration

1. Link your LINE Official Account:
   - Go to dashboard > Hamburger menu > "LINE連携"
   - Click "LINE公式アカウントを追加" button
   - Add the LINE Official Account as a friend
   - Account will be automatically linked

2. Create events via LINE:
   - Add the LINE Official Account to a group chat
   - Mention the bot with "集金" message
   - The bot will analyze chat history and create an event automatically
   - Review the event details and confirm
   - Payment link will be sent to the group

**Note:** Only users who have linked their LINE account can create events via LINE. Unlinked users will receive a message prompting them to register and link their account.

## License

MIT
