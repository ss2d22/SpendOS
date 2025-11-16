# SpendOS Frontend

Treasury management system with programmable spend accounts and cross-chain USDC transfers via Circle Gateway.

Built with Next.js 16, TypeScript, wagmi v2, RainbowKit, and shadcn/ui.

---

## Quick Start

### Prerequisites

- Node.js 20+
- SpendOS Backend running on port 3001
- Treasury contract deployed
- WalletConnect Project ID

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your values:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   NEXT_PUBLIC_TREASURY_ADDRESS=0x...
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

Open http://localhost:3000 to see the app.

---

## What's Built

### Core Features

- **Circle Gateway Integration** - Unified USDC balance across chains with cross-chain transfers
- **Role-Based Access** - Admin, manager, and spender roles with different permissions
- **SIWE Authentication** - Sign in with Ethereum wallet (no passwords needed)
- **Treasury Management** - View balances, fund treasury, track spending
- **Spend Accounts** - Create budgeted accounts with spending limits and approval workflows
- **Spend Requests** - Submit, approve, and execute cross-chain USDC transfers
- **Analytics** - Runway calculations and burn rate tracking
- **Real-time Alerts** - System notifications for important events

### Dashboard Pages

- **Admin** - Overview, accounts management, funding, settings
- **Manager** - Account overview, spend approvals
- **Spender** - Request funds, view history
- **Analytics** - Runway and department breakdown

### Tech Stack

- Next.js 16 App Router
- TypeScript with full type safety
- wagmi v2 + RainbowKit for Web3
- React Query v5 for data fetching
- Zod + react-hook-form for forms
- shadcn/ui components
- Tailwind CSS with dark mode

---

## How It Works

### Authentication

Users connect their wallet with RainbowKit and sign in using SIWE (Sign-In With Ethereum). The backend issues a JWT token stored in an HTTP-only cookie for security.

### Circle Gateway Integration

The treasury uses Circle's Gateway API to maintain a unified USDC balance across multiple chains. When users request funds, they can specify any supported destination chain and the system handles the cross-chain transfer automatically.

### Spend Account Workflow

1. Admin creates spend account with budget limits
2. Account owner (spender) submits spend request
3. Account approver reviews and approves/rejects
4. Approved requests execute automatically via smart contract
5. Funds are sent cross-chain using Circle Gateway

---

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

---

## Project Structure

```
app/
├── dashboard/           # Main app (protected routes)
│   ├── admin/          # Admin pages
│   ├── manager/        # Manager pages
│   ├── spender/        # Spender pages
│   └── analytics/      # Analytics pages
├── page.tsx            # Landing page
└── layout.tsx          # Root layout

components/
├── ui/                 # shadcn components
├── accounts/           # Account cards and forms
├── spends/             # Spend request components
├── treasury/           # Treasury balance cards
└── common/             # Shared components

lib/
├── api/               # Backend API calls
├── contracts/         # Contract hooks
├── hooks/             # React Query hooks
└── utils/             # Helper functions
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-id
```

---

## License

MIT
