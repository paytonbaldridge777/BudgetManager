-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name) VALUES 
  ('Housing'),
  ('Utilities'),
  ('Groceries'),
  ('Transportation'),
  ('Insurance'),
  ('Debt Payments'),
  ('Savings'),
  ('Entertainment'),
  ('Miscellaneous');

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  category_id INTEGER NOT NULL,
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'csv')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- Monthly budgets table
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  budget_amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, category_id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Index for faster budget queries
CREATE INDEX IF NOT EXISTS idx_budgets_month ON monthly_budgets(month);
