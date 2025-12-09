# Budget Manager

A personal home budget web application built for Cloudflare Pages and Workers. Track income and expenses, create monthly budgets, and view spending reports with a clean, modern interface.

## Features

- ✅ **Transaction Tracking**: Manually add income and expense transactions
- 💰 **Monthly Budgets**: Set budgets per category and track actual vs budgeted spending
- 📊 **Reports & Insights**: View monthly summaries and category breakdowns with charts
- 📁 **CSV Import**: Import transactions from CSV files with custom column mapping
- 🏷️ **Custom Categories**: Add, rename, and manage spending categories
- 📱 **Responsive Design**: Clean, mobile-friendly interface inspired by Monarch Money and YNAB
- ☁️ **Serverless**: Runs entirely on free Cloudflare services (Workers + D1)

## Tech Stack

- **Frontend**: TypeScript, HTML5, CSS3 (vanilla - no frameworks)
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Build Tools**: Rollup, TypeScript Compiler
- **Deployment**: Cloudflare Pages + Workers

## Project Structure

```
.
├── db/
│   └── schema.sql              # Database schema and initial data
├── public/
│   ├── index.html              # Main HTML file
│   └── styles.css              # Application styles
├── src/
│   ├── frontend/
│   │   └── main.ts             # Frontend TypeScript code
│   └── worker/
│       └── index.ts            # Cloudflare Worker API endpoints
├── package.json
├── tsconfig.json
├── rollup.config.js
└── wrangler.toml               # Cloudflare configuration
```

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier is sufficient)
- Wrangler CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BudgetManager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a D1 database**
   ```bash
   # Create the database
   npx wrangler d1 create budget-db
   ```
   
   This will output a database ID. Copy it and update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "BUDGET_DB"
   database_name = "budget-db"
   database_id = "your-database-id-here"  # Replace with actual ID
   ```

4. **Initialize the database schema**
   ```bash
   # For local development
   npm run db:init

   # For production (after deploying)
   npm run db:init:remote
   ```

5. **Build the frontend**
   ```bash
   npm run build:frontend
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8787`

## Deployment to Cloudflare

### First-time Deployment

1. **Authenticate with Cloudflare**
   ```bash
   npx wrangler login
   ```

2. **Build the application**
   ```bash
   npm run build:frontend
   ```

3. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

4. **Initialize the production database**
   ```bash
   npm run db:init:remote
   ```

### Subsequent Deployments

After making changes, simply run:
```bash
npm run build:frontend && npm run deploy
```

## Usage Guide

### Dashboard
- View your current month's financial summary (income, expenses, net)
- See category-wise spending breakdown with charts
- Navigate between months using arrow buttons

### Budget
- Set monthly budgets for each category
- Compare budgeted amounts vs. actual spending
- Track remaining budget per category

### Transactions
- Add transactions manually with date, description, amount, type, and category
- Filter transactions by month
- Import transactions from CSV files
- Edit or delete existing transactions

### Settings
- Add new spending categories
- Delete/deactivate categories (keeps historical data)
- Default categories included: Housing, Utilities, Groceries, Transportation, Insurance, Debt Payments, Savings, Entertainment, Miscellaneous

### CSV Import
1. Click "Import CSV" on the Transactions page
2. Select your CSV file
3. Map CSV columns to transaction fields (date, description, amount)
4. Choose default type (income/expense) and category
5. Preview the data and confirm import

## API Endpoints

The application provides a REST API through Cloudflare Workers:

- **Categories**
  - `GET /api/categories` - List all active categories
  - `POST /api/categories` - Create a new category
  - `PUT /api/categories/:id` - Update a category
  - `DELETE /api/categories/:id` - Soft delete a category

- **Transactions**
  - `GET /api/transactions?month=YYYY-MM` - List transactions (optionally filtered by month)
  - `POST /api/transactions` - Create a transaction
  - `PUT /api/transactions/:id` - Update a transaction
  - `DELETE /api/transactions/:id` - Delete a transaction
  - `POST /api/transactions/import` - Bulk import transactions

- **Budgets**
  - `GET /api/budgets?month=YYYY-MM` - Get budgets for a specific month
  - `POST /api/budgets` - Save/update multiple category budgets for a month

- **Reports**
  - `GET /api/reports/summary?month=YYYY-MM` - Get monthly summary with category breakdown

## Database Schema

### categories
- `id` - Primary key
- `name` - Category name (unique)
- `is_active` - Active flag (1 = active, 0 = deleted)
- `created_at` - Timestamp

### transactions
- `id` - Primary key
- `date` - Transaction date
- `description` - Description
- `amount` - Amount (positive number)
- `type` - 'income' or 'expense'
- `category_id` - Foreign key to categories
- `source` - 'manual' or 'csv'
- `created_at` - Timestamp

### monthly_budgets
- `id` - Primary key
- `month` - Month in YYYY-MM format
- `category_id` - Foreign key to categories
- `budget_amount` - Budgeted amount
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Design Philosophy

- **Simple & Clean**: Minimalist interface focused on essential features
- **No Clutter**: Information organized across separate pages
- **Fast & Lightweight**: Vanilla TypeScript, no heavy frameworks
- **Free Forever**: Runs entirely on Cloudflare's free tier
- **Privacy-Focused**: Single user, no authentication, data stays in your Cloudflare account

## Limitations

- Single user only (no authentication or multi-user support)
- No bank API integration (manual entry or CSV import only)
- No mobile app (responsive web app only)
- No data export (other than downloading from D1 directly)

## Future Enhancements (Potential)

- Recurring transactions
- Budget templates
- Year-over-year comparisons
- More detailed reports and charts
- Data export functionality
- Dark mode

## Contributing

This is a personal project template. Feel free to fork and customize for your own use!

## License

MIT License - Feel free to use and modify as needed.

## Support

For issues or questions, please check:
1. Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
2. Cloudflare D1 documentation: https://developers.cloudflare.com/d1/
3. Wrangler CLI documentation: https://developers.cloudflare.com/workers/wrangler/

---

Built with ❤️ for personal finance management on Cloudflare's edge network.
