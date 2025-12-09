(function () {
    'use strict';

    // Main TypeScript file for Budget Manager frontend
    // API base URL
    const API_BASE = '/api';
    let categories = [];
    let currentMonth = getCurrentMonth();
    // Utility functions
    function getCurrentMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    function formatMonth(monthStr) {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    function changeMonth(offset) {
        const [year, month] = currentMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    // API functions
    async function fetchCategories() {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok)
            throw new Error('Failed to fetch categories');
        return response.json();
    }
    async function createCategory(name) {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok)
            throw new Error('Failed to create category');
        return response.json();
    }
    async function deleteCategory(id) {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok)
            throw new Error('Failed to delete category');
    }
    async function fetchTransactions(month) {
        const url = month ? `${API_BASE}/transactions?month=${month}` : `${API_BASE}/transactions`;
        const response = await fetch(url);
        if (!response.ok)
            throw new Error('Failed to fetch transactions');
        return response.json();
    }
    async function createTransaction(transaction) {
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        if (!response.ok)
            throw new Error('Failed to create transaction');
        return response.json();
    }
    async function updateTransaction(id, transaction) {
        const response = await fetch(`${API_BASE}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        if (!response.ok)
            throw new Error('Failed to update transaction');
    }
    async function deleteTransaction(id) {
        const response = await fetch(`${API_BASE}/transactions/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok)
            throw new Error('Failed to delete transaction');
    }
    async function importTransactions(transactions) {
        const response = await fetch(`${API_BASE}/transactions/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions })
        });
        if (!response.ok)
            throw new Error('Failed to import transactions');
    }
    async function saveBudgets(month, budgets) {
        const response = await fetch(`${API_BASE}/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, budgets })
        });
        if (!response.ok)
            throw new Error('Failed to save budgets');
    }
    async function fetchSummary(month) {
        const response = await fetch(`${API_BASE}/reports/summary?month=${month}`);
        if (!response.ok)
            throw new Error('Failed to fetch summary');
        return response.json();
    }
    // Navigation
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.dataset.page;
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                // Show corresponding page
                pages.forEach(p => p.classList.remove('active'));
                document.getElementById(`${pageId}-page`)?.classList.add('active');
                // Load page data
                if (pageId === 'dashboard')
                    loadDashboard();
                else if (pageId === 'budget')
                    loadBudget();
                else if (pageId === 'transactions')
                    loadTransactions();
                else if (pageId === 'settings')
                    loadSettings();
            });
        });
    }
    // Dashboard Page
    async function loadDashboard() {
        document.getElementById('current-month').textContent = formatMonth(currentMonth);
        try {
            const summary = await fetchSummary(currentMonth);
            // Update summary cards
            document.getElementById('total-income').textContent = formatCurrency(summary.total_income);
            document.getElementById('total-expenses').textContent = formatCurrency(summary.total_expenses);
            const netElement = document.getElementById('net-amount');
            netElement.textContent = formatCurrency(summary.net);
            netElement.className = `card-value ${summary.net >= 0 ? 'income' : 'expense'}`;
            // Update category breakdown table
            const tbody = document.querySelector('#category-table tbody');
            tbody.innerHTML = '';
            summary.category_breakdown.forEach(cat => {
                if (cat.actual > 0 || cat.budgeted > 0) {
                    const row = document.createElement('tr');
                    const remaining = cat.budgeted - cat.actual;
                    const percent = cat.budgeted > 0 ? (cat.actual / cat.budgeted * 100).toFixed(1) : '0';
                    row.innerHTML = `
          <td>${cat.name}</td>
          <td>${formatCurrency(cat.budgeted)}</td>
          <td>${formatCurrency(cat.actual)}</td>
          <td class="${remaining >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(remaining)}
          </td>
          <td>${percent}%</td>
        `;
                    tbody.appendChild(row);
                }
            });
            // Draw chart
            drawCategoryChart(summary.category_breakdown);
        }
        catch (error) {
            console.error('Failed to load dashboard:', error);
            alert('Failed to load dashboard data');
        }
    }
    function drawCategoryChart(breakdown) {
        const canvas = document.getElementById('category-chart');
        const ctx = canvas.getContext('2d');
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        // Filter categories with actual spending
        const data = breakdown.filter(cat => cat.actual > 0);
        if (data.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No spending data for this month', canvas.width / 2, canvas.height / 2);
            return;
        }
        // Simple bar chart
        const barWidth = canvas.width / data.length;
        const maxAmount = Math.max(...data.map(d => d.actual));
        const scale = (canvas.height - 60) / maxAmount;
        data.forEach((cat, i) => {
            const barHeight = cat.actual * scale;
            const x = i * barWidth;
            const y = canvas.height - barHeight - 30;
            // Draw bar
            ctx.fillStyle = '#4f46e5';
            ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
            // Draw label
            ctx.fillStyle = '#111827';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, canvas.height - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(cat.name, 0, 0);
            ctx.restore();
            // Draw value
            ctx.fillText(formatCurrency(cat.actual), x + barWidth / 2, y - 5);
        });
    }
    // Budget Page
    async function loadBudget() {
        document.getElementById('budget-current-month').textContent = formatMonth(currentMonth);
        try {
            const summary = await fetchSummary(currentMonth);
            const tbody = document.querySelector('#budget-table tbody');
            tbody.innerHTML = '';
            let totalBudgeted = 0;
            let totalActual = 0;
            categories.forEach(cat => {
                const catData = summary.category_breakdown.find(c => c.id === cat.id);
                const budgeted = catData?.budgeted || 0;
                const actual = catData?.actual || 0;
                const difference = budgeted - actual;
                totalBudgeted += budgeted;
                totalActual += actual;
                const row = document.createElement('tr');
                row.innerHTML = `
        <td>${cat.name}</td>
        <td>
          <input type="number" 
                 class="budget-input" 
                 data-category-id="${cat.id}" 
                 value="${budgeted}" 
                 step="0.01" 
                 min="0">
        </td>
        <td>${formatCurrency(actual)}</td>
        <td class="${difference >= 0 ? 'text-success' : 'text-danger'}">
          ${formatCurrency(difference)}
        </td>
      `;
                tbody.appendChild(row);
            });
            // Update totals
            document.getElementById('total-budgeted').textContent = formatCurrency(totalBudgeted);
            document.getElementById('total-actual').textContent = formatCurrency(totalActual);
            const totalDiff = totalBudgeted - totalActual;
            const totalDiffElement = document.getElementById('total-difference');
            totalDiffElement.textContent = formatCurrency(totalDiff);
            totalDiffElement.className = totalDiff >= 0 ? 'text-success' : 'text-danger';
        }
        catch (error) {
            console.error('Failed to load budget:', error);
            alert('Failed to load budget data');
        }
    }
    async function saveBudgetData() {
        const inputs = document.querySelectorAll('.budget-input');
        const budgets = [];
        inputs.forEach(input => {
            const categoryId = parseInt(input.dataset.categoryId);
            const budgetAmount = parseFloat(input.value) || 0;
            budgets.push({ month: currentMonth, category_id: categoryId, budget_amount: budgetAmount });
        });
        try {
            await saveBudgets(currentMonth, budgets);
            alert('Budget saved successfully!');
            loadBudget();
        }
        catch (error) {
            console.error('Failed to save budget:', error);
            alert('Failed to save budget');
        }
    }
    // Transactions Page
    async function loadTransactions() {
        populateMonthFilter();
        const monthFilter = document.getElementById('transaction-month-filter').value;
        try {
            const transactions = await fetchTransactions(monthFilter);
            const tbody = document.querySelector('#transactions-table tbody');
            tbody.innerHTML = '';
            transactions.forEach(txn => {
                const row = document.createElement('tr');
                row.innerHTML = `
        <td>${txn.date}</td>
        <td>${txn.description}</td>
        <td>${txn.category_name || 'Unknown'}</td>
        <td><span class="${txn.type === 'income' ? 'text-success' : 'text-danger'}">${txn.type}</span></td>
        <td>${formatCurrency(txn.amount)}</td>
        <td>${txn.source || 'manual'}</td>
        <td>
          <button class="btn-danger" onclick="handleDeleteTransaction(${txn.id})">Delete</button>
        </td>
      `;
                tbody.appendChild(row);
            });
        }
        catch (error) {
            console.error('Failed to load transactions:', error);
            alert('Failed to load transactions');
        }
    }
    function populateMonthFilter() {
        const select = document.getElementById('transaction-month-filter');
        if (select.options.length > 0)
            return; // Already populated
        // Generate last 12 months
        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push({ value: monthStr, label: formatMonth(monthStr) });
        }
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month.value;
            option.textContent = month.label;
            select.appendChild(option);
        });
        select.value = currentMonth;
    }
    function openTransactionModal(transaction) {
        const modal = document.getElementById('transaction-modal');
        const form = document.getElementById('transaction-form');
        const title = document.getElementById('transaction-modal-title');
        // Populate category dropdown
        const categorySelect = document.getElementById('transaction-category');
        categorySelect.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id.toString();
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
        {
            title.textContent = 'Add Transaction';
            form.reset();
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        }
        modal.classList.add('active');
    }
    function closeTransactionModal() {
        document.getElementById('transaction-modal').classList.remove('active');
    }
    async function handleTransactionSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value;
        const transaction = {
            date: document.getElementById('transaction-date').value,
            description: document.getElementById('transaction-description').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            type: document.getElementById('transaction-type').value,
            category_id: parseInt(document.getElementById('transaction-category').value)
        };
        try {
            if (id) {
                await updateTransaction(parseInt(id), transaction);
            }
            else {
                await createTransaction(transaction);
            }
            closeTransactionModal();
            loadTransactions();
        }
        catch (error) {
            console.error('Failed to save transaction:', error);
            alert('Failed to save transaction');
        }
    }
    async function handleDeleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?'))
            return;
        try {
            await deleteTransaction(id);
            loadTransactions();
        }
        catch (error) {
            console.error('Failed to delete transaction:', error);
            alert('Failed to delete transaction');
        }
    }
    // CSV Import
    function openCSVImportModal() {
        const modal = document.getElementById('csv-import-modal');
        document.getElementById('csv-upload-step').style.display = 'block';
        document.getElementById('csv-mapping-step').style.display = 'none';
        document.getElementById('csv-file').value = '';
        modal.classList.add('active');
    }
    function closeCSVImportModal() {
        document.getElementById('csv-import-modal').classList.remove('active');
    }
    let parsedCSVData = [];
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            rows.push(row);
        }
        return rows;
    }
    async function handleCSVParse() {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files?.[0];
        if (!file) {
            alert('Please select a CSV file');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvText = e.target?.result;
            parsedCSVData = parseCSV(csvText);
            if (parsedCSVData.length === 0) {
                alert('No data found in CSV');
                return;
            }
            // Show mapping step
            document.getElementById('csv-upload-step').style.display = 'none';
            document.getElementById('csv-mapping-step').style.display = 'block';
            // Populate column dropdowns
            const headers = Object.keys(parsedCSVData[0]);
            const selects = ['csv-date-column', 'csv-description-column', 'csv-amount-column'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                select.innerHTML = '';
                headers.forEach(header => {
                    const option = document.createElement('option');
                    option.value = header;
                    option.textContent = header;
                    select.appendChild(option);
                });
            });
            // Populate category dropdown
            const categorySelect = document.getElementById('csv-default-category');
            categorySelect.innerHTML = '';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id.toString();
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
            // Show preview
            showCSVPreview();
        };
        reader.readAsText(file);
    }
    function showCSVPreview() {
        const preview = document.getElementById('csv-preview');
        const previewRows = parsedCSVData.slice(0, 5);
        let html = '<table><thead><tr>';
        Object.keys(previewRows[0]).forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        previewRows.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(value => {
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        preview.innerHTML = html;
    }
    async function handleCSVImport() {
        const dateColumn = document.getElementById('csv-date-column').value;
        const descColumn = document.getElementById('csv-description-column').value;
        const amountColumn = document.getElementById('csv-amount-column').value;
        const defaultType = document.getElementById('csv-default-type').value;
        const defaultCategory = parseInt(document.getElementById('csv-default-category').value);
        const transactions = parsedCSVData.map(row => {
            // Parse date (handle various formats)
            let date = row[dateColumn];
            if (date) {
                // Try to convert to YYYY-MM-DD format
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    date = parsedDate.toISOString().split('T')[0];
                }
            }
            // Parse amount (remove currency symbols, handle negatives)
            let amount = parseFloat(row[amountColumn].replace(/[$,]/g, ''));
            return {
                date,
                description: row[descColumn],
                amount: Math.abs(amount),
                type: defaultType,
                category_id: defaultCategory,
                source: 'csv'
            };
        }).filter(txn => txn.date && txn.description && !isNaN(txn.amount));
        try {
            await importTransactions(transactions);
            alert(`Successfully imported ${transactions.length} transactions`);
            closeCSVImportModal();
            loadTransactions();
        }
        catch (error) {
            console.error('Failed to import transactions:', error);
            alert('Failed to import transactions');
        }
    }
    // Settings Page
    async function loadSettings() {
        const list = document.getElementById('categories-list');
        list.innerHTML = '';
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `
      <span>${cat.name}</span>
      <div class="category-actions">
        <button class="btn-danger" onclick="handleDeleteCategory(${cat.id})">Delete</button>
      </div>
    `;
            list.appendChild(li);
        });
    }
    async function handleAddCategory() {
        const input = document.getElementById('new-category-name');
        const name = input.value.trim();
        if (!name) {
            alert('Please enter a category name');
            return;
        }
        try {
            await createCategory(name);
            input.value = '';
            categories = await fetchCategories();
            loadSettings();
        }
        catch (error) {
            console.error('Failed to add category:', error);
            alert('Failed to add category');
        }
    }
    async function handleDeleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category? It will be deactivated but historical data will remain.'))
            return;
        try {
            await deleteCategory(id);
            categories = await fetchCategories();
            loadSettings();
        }
        catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category');
        }
    }
    // Month navigation handlers
    function setupMonthNavigation() {
        // Dashboard month nav
        document.getElementById('prev-month').addEventListener('click', () => {
            currentMonth = changeMonth(-1);
            loadDashboard();
        });
        document.getElementById('next-month').addEventListener('click', () => {
            currentMonth = changeMonth(1);
            loadDashboard();
        });
        // Budget month nav
        document.getElementById('budget-prev-month').addEventListener('click', () => {
            currentMonth = changeMonth(-1);
            loadBudget();
        });
        document.getElementById('budget-next-month').addEventListener('click', () => {
            currentMonth = changeMonth(1);
            loadBudget();
        });
    }
    // Initialize app
    async function init() {
        try {
            // Load categories
            categories = await fetchCategories();
            // Setup navigation
            setupNavigation();
            setupMonthNavigation();
            // Setup event listeners
            document.getElementById('add-transaction-btn').addEventListener('click', () => openTransactionModal());
            document.getElementById('import-csv-btn').addEventListener('click', openCSVImportModal);
            document.getElementById('save-budget').addEventListener('click', saveBudgetData);
            document.getElementById('add-category-btn').addEventListener('click', handleAddCategory);
            // Modal close buttons
            document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    closeTransactionModal();
                    closeCSVImportModal();
                });
            });
            // Transaction form
            document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
            // CSV import
            document.getElementById('csv-parse-btn').addEventListener('click', handleCSVParse);
            document.getElementById('csv-import-confirm-btn').addEventListener('click', handleCSVImport);
            // Transaction filter
            document.getElementById('transaction-month-filter').addEventListener('change', loadTransactions);
            // Load initial dashboard
            loadDashboard();
        }
        catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Failed to initialize application. Please check console for errors.');
        }
    }
    // Make functions available globally for onclick handlers
    window.handleDeleteTransaction = handleDeleteTransaction;
    window.handleDeleteCategory = handleDeleteCategory;
    // Start the app
    document.addEventListener('DOMContentLoaded', init);

})();
//# sourceMappingURL=bundle.js.map
