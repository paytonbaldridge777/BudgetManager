// Cloudflare Worker for Budget Manager API
// This worker handles all API routes for the budget application

export interface Env {
  BUDGET_DB: D1Database;
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Handle CORS preflight
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Categories handlers
async function getCategories(env: Env) {
  try {
    const { results } = await env.BUDGET_DB.prepare(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY name'
    ).all();
    return jsonResponse(results);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function createCategory(env: Env, body: any) {
  try {
    const { name } = body;
    if (!name || typeof name !== 'string') {
      return errorResponse('Category name is required');
    }
    
    const result = await env.BUDGET_DB.prepare(
      'INSERT INTO categories (name) VALUES (?)'
    ).bind(name).run();
    
    return jsonResponse({ id: result.meta.last_row_id, name, is_active: 1 }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function updateCategory(env: Env, id: string, body: any) {
  try {
    const { name } = body;
    if (!name || typeof name !== 'string') {
      return errorResponse('Category name is required');
    }
    
    await env.BUDGET_DB.prepare(
      'UPDATE categories SET name = ? WHERE id = ?'
    ).bind(name, id).run();
    
    return jsonResponse({ id: parseInt(id), name });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function deleteCategory(env: Env, id: string) {
  try {
    // Soft delete - just mark as inactive
    await env.BUDGET_DB.prepare(
      'UPDATE categories SET is_active = 0 WHERE id = ?'
    ).bind(id).run();
    
    return jsonResponse({ message: 'Category deactivated successfully' });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// Transactions handlers
async function getTransactions(env: Env, url: URL) {
  try {
    const month = url.searchParams.get('month');
    let query = `
      SELECT t.*, c.name as category_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
    `;
    
    if (month) {
      query += ` WHERE strftime('%Y-%m', t.date) = ?`;
      const { results } = await env.BUDGET_DB.prepare(query + ' ORDER BY t.date DESC')
        .bind(month).all();
      return jsonResponse(results);
    } else {
      const { results } = await env.BUDGET_DB.prepare(query + ' ORDER BY t.date DESC LIMIT 100')
        .all();
      return jsonResponse(results);
    }
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function createTransaction(env: Env, body: any) {
  try {
    const { date, description, amount, type, category_id, source = 'manual' } = body;
    
    if (!date || !description || amount === undefined || !type || !category_id) {
      return errorResponse('Missing required fields');
    }
    
    if (type !== 'income' && type !== 'expense') {
      return errorResponse('Type must be "income" or "expense"');
    }
    
    const result = await env.BUDGET_DB.prepare(
      'INSERT INTO transactions (date, description, amount, type, category_id, source) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(date, description, amount, type, category_id, source).run();
    
    return jsonResponse({ 
      id: result.meta.last_row_id, 
      date, 
      description, 
      amount, 
      type, 
      category_id,
      source 
    }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function updateTransaction(env: Env, id: string, body: any) {
  try {
    const { date, description, amount, type, category_id } = body;
    
    if (!date || !description || amount === undefined || !type || !category_id) {
      return errorResponse('Missing required fields');
    }
    
    await env.BUDGET_DB.prepare(
      'UPDATE transactions SET date = ?, description = ?, amount = ?, type = ?, category_id = ? WHERE id = ?'
    ).bind(date, description, amount, type, category_id, id).run();
    
    return jsonResponse({ id: parseInt(id), date, description, amount, type, category_id });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function deleteTransaction(env: Env, id: string) {
  try {
    await env.BUDGET_DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
    return jsonResponse({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function importTransactions(env: Env, body: any) {
  try {
    const { transactions } = body;
    if (!Array.isArray(transactions)) {
      return errorResponse('Transactions must be an array');
    }
    
    let imported = 0;
    for (const txn of transactions) {
      const { date, description, amount, type, category_id, source = 'csv' } = txn;
      if (date && description && amount !== undefined && type && category_id) {
        await env.BUDGET_DB.prepare(
          'INSERT INTO transactions (date, description, amount, type, category_id, source) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(date, description, amount, type, category_id, source).run();
        imported++;
      }
    }
    
    return jsonResponse({ message: `${imported} transactions imported successfully`, imported });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// Budget handlers
async function getBudgets(env: Env, url: URL) {
  try {
    const month = url.searchParams.get('month');
    if (!month) {
      return errorResponse('Month parameter is required');
    }
    
    const { results } = await env.BUDGET_DB.prepare(`
      SELECT mb.*, c.name as category_name
      FROM monthly_budgets mb
      LEFT JOIN categories c ON mb.category_id = c.id
      WHERE mb.month = ?
      ORDER BY c.name
    `).bind(month).all();
    
    return jsonResponse(results);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

async function saveBudgets(env: Env, body: any) {
  try {
    const { month, budgets } = body;
    if (!month || !Array.isArray(budgets)) {
      return errorResponse('Month and budgets array are required');
    }
    
    for (const budget of budgets) {
      const { category_id, budget_amount } = budget;
      if (category_id && budget_amount !== undefined) {
        await env.BUDGET_DB.prepare(`
          INSERT INTO monthly_budgets (month, category_id, budget_amount)
          VALUES (?, ?, ?)
          ON CONFLICT(month, category_id) 
          DO UPDATE SET budget_amount = excluded.budget_amount, updated_at = CURRENT_TIMESTAMP
        `).bind(month, category_id, budget_amount).run();
      }
    }
    
    return jsonResponse({ message: 'Budgets saved successfully' });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// Reports handlers
async function getSummary(env: Env, url: URL) {
  try {
    const month = url.searchParams.get('month');
    if (!month) {
      return errorResponse('Month parameter is required');
    }
    
    // Get total income and expenses
    const { results: totals } = await env.BUDGET_DB.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
      FROM transactions
      WHERE strftime('%Y-%m', date) = ?
    `).bind(month).all();
    
    // Get category breakdown with budgets
    const { results: categoryBreakdown } = await env.BUDGET_DB.prepare(`
      SELECT 
        c.id,
        c.name,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as actual,
        COALESCE(mb.budget_amount, 0) as budgeted
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND strftime('%Y-%m', t.date) = ?
      LEFT JOIN monthly_budgets mb ON c.id = mb.category_id AND mb.month = ?
      WHERE c.is_active = 1
      GROUP BY c.id, c.name, mb.budget_amount
      ORDER BY actual DESC
    `).bind(month, month).all();
    
    const totalIncome = totals[0]?.total_income || 0;
    const totalExpenses = totals[0]?.total_expenses || 0;
    const net = totalIncome - totalExpenses;
    
    return jsonResponse({
      month,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net,
      category_breakdown: categoryBreakdown
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// Main request router
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      // Categories routes
      if (path === '/api/categories') {
        if (method === 'GET') return getCategories(env);
        if (method === 'POST') {
          const body = await request.json();
          return createCategory(env, body);
        }
      }
      
      if (path.match(/^\/api\/categories\/\d+$/)) {
        const id = path.split('/').pop()!;
        if (method === 'PUT') {
          const body = await request.json();
          return updateCategory(env, id, body);
        }
        if (method === 'DELETE') return deleteCategory(env, id);
      }

      // Transactions routes
      if (path === '/api/transactions') {
        if (method === 'GET') return getTransactions(env, url);
        if (method === 'POST') {
          const body = await request.json();
          return createTransaction(env, body);
        }
      }
      
      if (path === '/api/transactions/import') {
        if (method === 'POST') {
          const body = await request.json();
          return importTransactions(env, body);
        }
      }
      
      if (path.match(/^\/api\/transactions\/\d+$/)) {
        const id = path.split('/').pop()!;
        if (method === 'PUT') {
          const body = await request.json();
          return updateTransaction(env, id, body);
        }
        if (method === 'DELETE') return deleteTransaction(env, id);
      }

      // Budgets routes
      if (path === '/api/budgets') {
        if (method === 'GET') return getBudgets(env, url);
        if (method === 'POST') {
          const body = await request.json();
          return saveBudgets(env, body);
        }
      }

      // Reports routes
      if (path === '/api/reports/summary') {
        if (method === 'GET') return getSummary(env, url);
      }

      // 404 for unmatched routes
      return errorResponse('Not found', 404);
    } catch (error: any) {
      console.error('Error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  },
};
