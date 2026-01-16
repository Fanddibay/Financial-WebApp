# Financial Tracker PWA

A production-ready Vue 3 Progressive Web App for tracking income and expenses with full CRUD operations. Built with clean architecture, modular data layer, and scalable design ready for backend integration.

## Features

- ✅ **Full CRUD Operations** - Create, Read, Update, Delete transactions
- ✅ **PWA Support** - Installable, offline-capable Progressive Web App
- ✅ **AI Chatbot Assistant** - Intelligent financial assistant with OpenAI integration
- ✅ **IDR Currency** - Indonesian Rupiah formatting throughout
- ✅ **Modular Data Layer** - Easy to swap localStorage for Supabase/REST API
- ✅ **TypeScript** - Full type safety throughout
- ✅ **Tailwind CSS** - Modern, responsive UI
- ✅ **Font Awesome** - Beautiful icons
- ✅ **Pinia State Management** - Reactive, composable stores
- ✅ **Vue Router** - Client-side routing with lazy loading
- ✅ **Clean Architecture** - Reusable components, services, and stores

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Pinia** - State management
- **Vue Router 4** - Routing
- **Tailwind CSS 3** - Utility-first CSS
- **Font Awesome 7** - Icons
- **Vite PWA Plugin** - Service worker & manifest
- **OpenAI API** - AI chatbot (optional, falls back to mock service)

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── BaseButton.vue
│   │   ├── BaseCard.vue
│   │   ├── BaseInput.vue
│   │   ├── BaseModal.vue
│   │   └── BaseSelect.vue
│   ├── transactions/     # Transaction-specific components
│   │   ├── TransactionCard.vue
│   │   ├── TransactionForm.vue
│   │   └── SummaryCard.vue
│   └── chat/            # Chatbot components
│       ├── ChatButton.vue
│       └── ChatWindow.vue
├── services/
│   ├── transactionService.ts  # Data layer (localStorage → API ready)
│   └── chatService.ts         # AI chatbot service (OpenAI/Mock)
├── stores/
│   ├── transaction.ts   # Pinia store for transactions
│   └── chat.ts          # Pinia store for chatbot
├── types/
│   ├── transaction.ts   # TypeScript interfaces
│   └── chat.ts          # Chat message & context types
├── utils/
│   └── currency.ts       # IDR currency formatting utilities
├── views/
│   ├── DashboardView.vue
│   ├── TransactionsView.vue
│   └── TransactionFormView.vue
└── router/
    └── index.ts
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Architecture

### Modular Data Layer

The `transactionService` implements an interface (`ITransactionService`) that can be easily swapped:

**Current**: `LocalStorageTransactionService` - stores data in browser localStorage

**Future**: Replace with `ApiTransactionService` or `SupabaseTransactionService`

Example API service structure is commented in `src/services/transactionService.ts`

### State Management

- **Pinia Store** (`stores/transaction.ts`) - Manages transaction state, loading, errors
- **Computed Properties** - Summary calculations, filtered lists
- **Actions** - CRUD operations that call the service layer

### Components

- **UI Components** (`components/ui/`) - Reusable, style-agnostic base components
- **Feature Components** (`components/transactions/`) - Business logic components
- **Views** (`views/`) - Page-level components with routing

## Routes

- `/` - Dashboard with summary and recent transactions
- `/transactions` - Full transaction list with filters
- `/transactions/new` - Create new transaction
- `/transactions/:id/edit` - Edit existing transaction

## Data Structure

```typescript
interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  date: string // ISO date string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}
```

## Currency

The app uses **Indonesian Rupiah (IDR)** for all currency displays. The `formatIDR()` utility function handles proper formatting with thousand separators and "Rp" prefix.

## AI Chatbot

The app includes an AI-powered financial assistant chatbot:

### Features

- **Floating Chat Button** - Always accessible in bottom-right corner
- **Context-Aware** - Knows your current financial summary and recent transactions
- **Modular AI Service** - Supports OpenAI API or mock service for development

### Setup OpenAI (Optional)

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env` file:
   ```env
   VITE_OPENAI_API_KEY=your-api-key-here
   ```
3. Or configure in the app (stored in localStorage)

**Without API Key**: The app uses a mock service with predefined responses for development/testing.

### Chat Features

- Ask about your balance, expenses, income
- Get budgeting advice
- Understand your financial patterns
- Chat history persists in localStorage

## Migrating to Backend

### Transaction Service

To replace localStorage with a backend:

1. Create new service class implementing `ITransactionService`
2. Update `src/services/transactionService.ts`:
   ```typescript
   export const transactionService: ITransactionService = new ApiTransactionService()
   ```
3. No changes needed in stores, components, or views!

### Chat Service

To use a different AI provider:

1. Create new service class implementing `IChatService`
2. Update `src/services/chatService.ts`:
   ```typescript
   export const chatService: IChatService = new AnthropicChatService()
   ```
3. Chat store and components work with any service implementation!

## PWA Features

- **Service Worker** - Caches assets for offline use
- **Web Manifest** - Installable on mobile/desktop
- **Auto-update** - Service worker updates automatically

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start development server      |
| `npm run build`     | Type check + production build |
| `npm run preview`   | Preview production build      |
| `npm run lint`      | Run ESLint + Prettier         |
| `npm run test:unit` | Run Vitest unit tests         |

## Supabase License Token System

The app includes a license token system for premium features using Supabase.

### Setup

1. **Install Dependencies**

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Environment Variables**

   Create `.env` file in project root:

   ```env
   VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd
   ```

   For production (Netlify/Vercel), add these as environment variables in your hosting platform.

3. **Setup Supabase Table**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project → **SQL Editor**
   - Copy and paste the contents of `supabase-setup.sql`
   - Click **Run**

   This will create the `license_tokens` table, enable RLS, create policies, and insert 5 initial tokens.

4. **Test Tokens**

   Initial tokens available:
   - `A1b2C3d4E5f!`
   - `X9y8Z7w6V5u@`
   - `M3n2O1p0Q9r#`
   - `S7t6U5v4W3x$`
   - `K1l2M3n4O5p%`

   Test by going to Profile page → Token & License section.

### Features

- ✅ One-device-per-license enforcement
- ✅ Cross-browser support
- ✅ Network error handling
- ✅ Feature gating (Basic: 3x limit, Premium: unlimited)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Visit [vercel.com](https://vercel.com) and login with GitHub
3. Click "Add New Project" → Import your repository
4. Framework preset: **Vite** (auto-detected)
5. Add environment variables if needed:
   - `VITE_OPENAI_API_KEY` (optional)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Netlify

1. Push code to GitHub
2. Visit [netlify.com](https://netlify.com) and login with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Site settings
7. Click "Deploy site"

### Cloudflare Pages

1. Push code to GitHub
2. Visit [dash.cloudflare.com](https://dash.cloudflare.com)
3. Go to "Pages" → "Create a project"
4. Connect to Git → Select GitHub repository
5. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Add environment variables if needed
7. Click "Save and Deploy"

### Build Locally (Before Deploy)

```bash
npm install
npm run build
npm run preview
```

## Troubleshooting

### PWA Installation Issues

If the install button doesn't appear on Android Chrome:

1. **Check PWA Requirements:**
   - ✅ HTTPS (required for production)
   - ✅ Valid manifest
   - ✅ Active service worker
   - ✅ Icons available

2. **Manual Install (Android Chrome):**
   - Open Chrome menu (3 dots)
   - Select "Add to Home screen" or "Install app"

3. **Debug Steps:**
   - Open DevTools → Application → Manifest (check if valid)
   - Application → Service Workers (should be active)
   - Clear browser cache and reload
   - Unregister service worker and reload

### Build Errors

```bash
# Ensure correct Node.js version (20.19.0+ or 22.12.0+)
node --version

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### License Token Issues

- **"Missing Supabase environment variables"**: Ensure `.env` file exists and restart dev server
- **"Invalid or inactive license token"**: Verify token exists in Supabase table and RLS policies are set
- **"Network error"**: Check internet connection and Supabase project status
- **"License already active on another device"**: This is expected - deactivate on other device first

### Service Worker Issues

- Ensure service worker file is accessible
- Check console for errors
- Verify headers include `Service-Worker-Allowed: /`
- Clear service worker cache in DevTools

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start development server      |
| `npm run build`     | Type check + production build |
| `npm run preview`   | Preview production build      |
| `npm run lint`      | Run ESLint + Prettier         |
| `npm run test:unit` | Run Vitest unit tests         |

## License

MIT
