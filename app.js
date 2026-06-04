// ═══════════════════════════════════════════
//  TRACKMYSPEND — EXPENSE TRACKER APP.JS
// ═══════════════════════════════════════════

// ── SUPABASE CONFIG ──
const SUPABASE_URL = 'https://ftwczeglepntedkwvulp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2N6ZWdsZXBudGVka3d2dWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTU0ODYsImV4cCI6MjA5MDgzMTQ4Nn0.kHpQ1P7oVhJWiuMHgw75ms_u4DLAKHylCXD8HIUInEA';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── STATE ──
let currentUser = null;
let userProfile = null;
let allTransactions = [];
let categories = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedType = 'debit';
let selectedCategory = 'Food & Dining';
let trendChart = null;
let categoryChart = null;
let isPasswordResetMode = false;

// ── DEFAULT CATEGORIES (used as fallback) ──
const DEFAULT_CATS = [
  { name: 'Food & Dining', icon: '🍔', color: '#EF4444' },
  { name: 'Transport', icon: '🚗', color: '#F59E0B' },
  { name: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { name: 'Bills & Utilities', icon: '⚡', color: '#8B5CF6' },
  { name: 'Entertainment', icon: '🎬', color: '#06B6D4' },
  { name: 'Health', icon: '💊', color: '#10B981' },
  { name: 'Education', icon: '📚', color: '#3B82F6' },
  { name: 'Salary', icon: '💰', color: '#22C55E' },
  { name: 'Recharge', icon: '📱', color: '#6366F1' },
  { name: 'Transfer', icon: '💸', color: '#A855F7' },
  { name: 'Other', icon: '📁', color: '#64748B' },
];

// ═══════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════
let lastSignupEmail = '';
let resendCooldown = 0;
let resendTimer = null;

function switchAuthTab(tab) {
  // Handle tab highlighting (login/signup only, forgot has no tab)
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'signup' && i === 1));
  });

  // Show/hide forms
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('forgot-form').style.display = tab === 'forgot' ? 'block' : 'none';
  document.getElementById('reset-password-form').style.display = tab === 'reset' ? 'block' : 'none';

  // Hide resend section when switching tabs
  document.getElementById('resend-section').style.display = 'none';

  // Show/hide tabs for forgot/reset
  const tabsEl = document.querySelector('.auth-tabs');
  tabsEl.style.display = (tab === 'forgot' || tab === 'reset') ? 'none' : 'flex';

  // Clear messages
  hideAuthMessage();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  btn.textContent = 'Logging in...';
  btn.disabled = true;
  errorEl.style.display = 'none';

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    btn.textContent = 'Log In';
    btn.disabled = false;
    return;
  }
  currentUser = data.user;
  await initApp();
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const errorEl = document.getElementById('signup-error');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;

  // Validate confirm password
  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Creating account...';
  btn.disabled = true;
  errorEl.style.display = 'none';

  const { data, error } = await db.auth.signUp({
    email, password,
    options: {
      data: { full_name: name },
      emailRedirectTo: 'https://trackmyspend-waish.netlify.app/'
    }
  });
  if (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    btn.textContent = 'Create Account';
    btn.disabled = false;
    return;
  }

  // Seed default categories
  if (data.user && data.session) {
    await db.rpc('seed_default_categories', { p_user_id: data.user.id });
    currentUser = data.user;
    await initApp();
  } else {
    // Email confirmation required — show resend section
    lastSignupEmail = email;
    showResendSection(email);
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('forgot-btn');
  const errorEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  const email = document.getElementById('forgot-email').value.trim();

  btn.textContent = 'Sending...';
  btn.disabled = true;
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://trackmyspend-waish.netlify.app/'
  });

  if (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    btn.textContent = 'Send Reset Link';
    btn.disabled = false;
    return;
  }

  successEl.textContent = '✅ Password reset link sent! Check your email.';
  successEl.style.display = 'block';
  btn.textContent = 'Send Reset Link';
  btn.disabled = false;
}

async function handleResetPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('reset-btn');
  const errorEl = document.getElementById('reset-error');
  const newPassword = document.getElementById('reset-password').value;
  const confirmPassword = document.getElementById('reset-confirm-password').value;

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Updating...';
  btn.disabled = true;
  errorEl.style.display = 'none';

  const { error } = await db.auth.updateUser({ password: newPassword });

  if (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    btn.textContent = 'Set New Password';
    btn.disabled = false;
    return;
  }

  showToast('✅ Password updated successfully!');
  isPasswordResetMode = false;
  
  // Redirect to app
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = session.user;
    await initApp();
  } else {
    switchAuthTab('login');
    showAuthMessage('Password updated! You can now log in with your new password.', 'success');
  }
}

async function handleLogout() {
  await db.auth.signOut();
  currentUser = null;
  userProfile = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('active');
  document.getElementById('fab').style.display = 'none';
}

// ── PASSWORD VISIBILITY TOGGLE ──
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const eyeOpen = btn.querySelector('.eye-open');
  const eyeClosed = btn.querySelector('.eye-closed');

  if (input.type === 'password') {
    input.type = 'text';
    eyeOpen.style.display = 'none';
    eyeClosed.style.display = 'block';
  } else {
    input.type = 'password';
    eyeOpen.style.display = 'block';
    eyeClosed.style.display = 'none';
  }
}

// ── AUTH MESSAGES ──
function showAuthMessage(message, type) {
  const el = document.getElementById('auth-message');
  el.textContent = message;
  el.className = 'auth-message ' + type;
  el.style.display = 'block';
}

function hideAuthMessage() {
  const el = document.getElementById('auth-message');
  el.style.display = 'none';
}

// ── RESEND VERIFICATION ──
function showResendSection(email) {
  // Hide all forms and tabs
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = 'none';
  document.querySelector('.auth-tabs').style.display = 'none';

  // Show resend section
  const section = document.getElementById('resend-section');
  section.style.display = 'block';
  document.getElementById('resend-email-display').textContent = email;
  document.getElementById('resend-status').textContent = '';
}

function hideResendSection() {
  document.getElementById('resend-section').style.display = 'none';
  document.querySelector('.auth-tabs').style.display = 'flex';
  if (resendTimer) clearInterval(resendTimer);
}

async function handleResendVerification() {
  if (resendCooldown > 0) return;

  const btn = document.getElementById('resend-btn');
  const statusEl = document.getElementById('resend-status');

  btn.textContent = 'Sending...';
  btn.disabled = true;
  statusEl.textContent = '';
  statusEl.className = 'resend-status';

  const { error } = await db.auth.resend({
    type: 'signup',
    email: lastSignupEmail,
    options: {
      emailRedirectTo: 'https://trackmyspend-waish.netlify.app/'
    }
  });

  if (error) {
    statusEl.textContent = '❌ ' + error.message;
    statusEl.className = 'resend-status error';
    btn.textContent = 'Resend Verification Email';
    btn.disabled = false;
    return;
  }

  statusEl.textContent = '✅ Verification email sent! Check your inbox.';
  statusEl.className = 'resend-status success';

  // Start 60-second cooldown
  resendCooldown = 60;
  btn.disabled = true;
  btn.textContent = `Resend in ${resendCooldown}s`;

  resendTimer = setInterval(() => {
    resendCooldown--;
    if (resendCooldown <= 0) {
      clearInterval(resendTimer);
      btn.textContent = 'Resend Verification Email';
      btn.disabled = false;
    } else {
      btn.textContent = `Resend in ${resendCooldown}s`;
    }
  }, 1000);
}

// ── TOAST ──
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════════
//  APP INIT
// ═══════════════════════════════════════════
async function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  document.getElementById('fab').style.display = 'flex';

  // Load profile
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  userProfile = profile || { full_name: '', monthly_budget: 0 };

  // Set greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greet}, ${userProfile.full_name || 'there'}`;

  const now = new Date();
  document.getElementById('date-display').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Load categories
  const { data: cats } = await db.from('categories').select('*').eq('user_id', currentUser.id);
  categories = cats && cats.length > 0 ? cats : DEFAULT_CATS;
  renderCategoryPicker();

  // Load settings
  document.getElementById('budget-input').value = userProfile.monthly_budget || '';
  document.getElementById('settings-name').value = userProfile.full_name || '';
  document.getElementById('settings-email').value = currentUser.email;

  // Set default date
  document.getElementById('tx-date').value = now.toISOString().split('T')[0];

  // Load transactions
  await loadTransactions();
}

// ═══════════════════════════════════════════
//  TRANSACTIONS CRUD
// ═══════════════════════════════════════════
async function loadTransactions() {
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('transaction_date', { ascending: false })
    .limit(500);

  allTransactions = data || [];
  updateDashboard();
  renderRecentTx();
  renderFullTxList();
}

async function submitTransaction() {
  const btn = document.getElementById('tx-submit');
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const desc = document.getElementById('tx-desc').value.trim();
  const date = document.getElementById('tx-date').value;

  if (!amount || amount <= 0) return alert('Enter a valid amount.');

  btn.textContent = 'Adding...';
  btn.disabled = true;

  const { error } = await db.from('transactions').insert([{
    user_id: currentUser.id,
    type: selectedType,
    amount,
    category: selectedCategory,
    description: desc || selectedCategory,
    source: 'manual',
    transaction_date: new Date(date).toISOString()
  }]);

  btn.textContent = 'Add Transaction';
  btn.disabled = false;

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  // Reset form
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  closeModal();
  await loadTransactions();
  showToast('✅ Transaction added!');
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  await db.from('transactions').delete().eq('id', id);
  await loadTransactions();
  showToast('🗑️ Transaction deleted');
}

// ═══════════════════════════════════════════
//  DASHBOARD CALCULATIONS
// ═══════════════════════════════════════════
function updateDashboard() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayDebit = 0, todayCredit = 0, monthDebit = 0, monthCredit = 0;

  allTransactions.forEach(tx => {
    const txDate = new Date(tx.transaction_date);
    const txDateStr = txDate.toISOString().split('T')[0];

    if (txDateStr === todayStr) {
      if (tx.type === 'debit') todayDebit += parseFloat(tx.amount);
      else todayCredit += parseFloat(tx.amount);
    }
    if (txDate >= monthStart) {
      if (tx.type === 'debit') monthDebit += parseFloat(tx.amount);
      else monthCredit += parseFloat(tx.amount);
    }
  });

  document.getElementById('today-spent').textContent = '₹' + todayDebit.toLocaleString('en-IN');
  document.getElementById('today-income').textContent = '₹' + todayCredit.toLocaleString('en-IN');
  document.getElementById('month-spent').textContent = '₹' + monthDebit.toLocaleString('en-IN');
  document.getElementById('month-income').textContent = '₹' + monthCredit.toLocaleString('en-IN');

  const budget = parseFloat(userProfile.monthly_budget) || 0;
  const remaining = budget > 0 ? Math.max(0, budget - monthDebit) : 0;
  document.getElementById('budget-left').textContent = budget > 0 ? '₹' + remaining.toLocaleString('en-IN') : 'No budget';

  updateCharts();
}

// ═══════════════════════════════════════════
//  CHARTS
// ═══════════════════════════════════════════
function updateCharts() {
  updateTrendChart();
  updateCategoryChart();
}

function updateTrendChart() {
  const now = new Date();
  const labels = [];
  const data = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

    const dayTotal = allTransactions
      .filter(tx => tx.type === 'debit' && new Date(tx.transaction_date).toISOString().split('T')[0] === dateStr)
      .reduce((s, tx) => s + parseFloat(tx.amount), 0);
    data.push(dayTotal);
  }

  const ctx = document.getElementById('chart-trend').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8892A8' : '#64748B';

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Spending',
        data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHitRadius: 10,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => '₹' + c.parsed.y.toLocaleString('en-IN') }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 7, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => '₹' + v, font: { size: 10 } }, beginAtZero: true }
      }
    }
  });
}

function updateCategoryChart() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const catTotals = {};

  allTransactions
    .filter(tx => tx.type === 'debit' && new Date(tx.transaction_date) >= monthStart)
    .forEach(tx => {
      catTotals[tx.category] = (catTotals[tx.category] || 0) + parseFloat(tx.amount);
    });

  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([name]) => name);
  const data = sorted.map(([, val]) => val);
  const colors = sorted.map(([name]) => {
    const cat = categories.find(c => c.name === name);
    return cat ? cat.color : '#64748B';
  });

  const ctx = document.getElementById('chart-category').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: document.documentElement.getAttribute('data-theme') !== 'light' ? '#8892A8' : '#64748B',
            padding: 12,
            font: { size: 11 },
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        },
        tooltip: {
          callbacks: { label: (c) => c.label + ': ₹' + c.parsed.toLocaleString('en-IN') }
        }
      }
    }
  });
}

// ═══════════════════════════════════════════
//  RENDER TRANSACTIONS
// ═══════════════════════════════════════════
function getCatIcon(catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.icon : '📁';
}

function renderTxItem(tx) {
  const icon = getCatIcon(tx.category);
  const dateStr = new Date(tx.transaction_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const sign = tx.type === 'debit' ? '−' : '+';
  const cls = tx.type;
  const badge = tx.source === 'sms'
    ? '<span class="tx-badge tx-badge-sms">SMS</span>'
    : '<span class="tx-badge tx-badge-manual">Manual</span>';

  return `
    <li class="tx-item">
      <div class="tx-cat-icon">${icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.description || tx.category}</div>
        <div class="tx-meta">
          <span>${dateStr}</span>
          <span>${tx.category}</span>
          ${badge}
        </div>
      </div>
      <div class="tx-amount ${cls}">${sign}₹${parseFloat(tx.amount).toLocaleString('en-IN')}</div>
      <button class="tx-delete" onclick="deleteTx('${tx.id}')" title="Delete">🗑️</button>
    </li>`;
}

function renderRecentTx() {
  const list = document.getElementById('recent-tx-list');
  const recent = allTransactions.slice(0, 8);
  if (recent.length === 0) {
    list.innerHTML = '<div class="tx-empty"><div class="empty-icon">📭</div><p>No transactions yet.<br>Tap + to add your first one.</p></div>';
    return;
  }
  list.innerHTML = recent.map(renderTxItem).join('');
}

function renderFullTxList() {
  const list = document.getElementById('full-tx-list');
  let filtered = [...allTransactions];

  if (currentFilter === 'debit') filtered = filtered.filter(t => t.type === 'debit');
  else if (currentFilter === 'credit') filtered = filtered.filter(t => t.type === 'credit');
  else if (currentFilter === 'sms') filtered = filtered.filter(t => t.source === 'sms');
  else if (currentFilter === 'manual') filtered = filtered.filter(t => t.source === 'manual');

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="tx-empty"><div class="empty-icon">🔍</div><p>No transactions found.</p></div>';
    return;
  }
  list.innerHTML = filtered.map(renderTxItem).join('');
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === f));
  renderFullTxList();
}
function searchTx(q) { searchQuery = q; renderFullTxList(); }

// ═══════════════════════════════════════════
//  UI: PAGE SWITCHING, MODAL, CATEGORIES
// ═══════════════════════════════════════════
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${page}`).style.display = 'block';
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  if (window.innerWidth < 768) toggleSidebar();
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
}
function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-overlay').classList.remove('active');
}

function setType(type) {
  selectedType = type;
  document.getElementById('type-debit').className = 'type-btn' + (type === 'debit' ? ' active-debit' : '');
  document.getElementById('type-credit').className = 'type-btn' + (type === 'credit' ? ' active-credit' : '');
}

function renderCategoryPicker() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = categories.map((c, i) => `
    <button type="button" class="cat-item${i === 0 ? ' active' : ''}" data-cat="${c.name}" onclick="pickCat(this, '${c.name}')">
      <span class="cat-emoji">${c.icon}</span>
      <span>${c.name.split(' ')[0]}</span>
    </button>
  `).join('');
  selectedCategory = categories[0]?.name || 'Other';
}

function pickCat(el, name) {
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selectedCategory = name;
}

// ── SIDEBAR / MOBILE ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

// ── THEME ──
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-track').classList.toggle('on', !isDark);
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  if (trendChart || categoryChart) updateCharts();
}

// ── SETTINGS ──
async function saveBudget() {
  const budget = parseFloat(document.getElementById('budget-input').value) || 0;
  await db.from('profiles').update({ monthly_budget: budget }).eq('id', currentUser.id);
  userProfile.monthly_budget = budget;
  updateDashboard();
  showToast('✅ Budget saved!');
}

async function saveProfile() {
  const name = document.getElementById('settings-name').value.trim();
  await db.from('profiles').update({ full_name: name }).eq('id', currentUser.id);
  userProfile.full_name = name;
  showToast('✅ Profile updated!');
}

// ═══════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════
(async function boot() {
  // Restore theme
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('theme-track').classList.toggle('on', saved === 'dark');
  }

  // Listen for auth state changes (handles email verify link + password reset link)
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // User clicked the password reset link in their email
      isPasswordResetMode = true;
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('app').classList.remove('active');
      document.getElementById('fab').style.display = 'none';
      switchAuthTab('reset');
      return;
    }

    if (event === 'SIGNED_IN' && !isPasswordResetMode) {
      // Check if this is from an email verification link
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      if (type === 'signup' || type === 'email') {
        showToast('✅ Email verified successfully!');
      }
      
      if (!currentUser && session) {
        currentUser = session.user;
        await initApp();
      }
    }
  });

  // Check existing session
  const { data: { session } } = await db.auth.getSession();
  if (session && !isPasswordResetMode) {
    currentUser = session.user;
    await initApp();
  }

  // Clean up URL hash after handling
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
})();
