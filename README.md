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
  date: string        // ISO date string
  createdAt: string   // ISO timestamp
  updatedAt: string   // ISO timestamp
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

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Type check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint + Prettier |
| `npm run test:unit` | Run Vitest unit tests |

## License

MIT
