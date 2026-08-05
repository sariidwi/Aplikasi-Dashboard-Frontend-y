/**
 * app.js — wires up login, records table (CRUD), stats cards, charts,
 * search/filter, and lightweight auto-refresh.
 */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const loginScreen = $('#login-screen');
  const appShell = $('#app');
  const loginForm = $('#login-form');
  const loginError = $('#login-error');
  const loginSubmit = $('#login-submit');

  let allRecords = [];
  let pendingDeleteId = null;
  let pollHandle = null;

  // ---------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------
  function toast(message, type = 'info') {
    const stack = $('#toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast${type === 'error' ? ' toast-error' : type === 'warn' ? ' toast-warn' : ''}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------------------------------------------------------------
  // Auth flow
  // ---------------------------------------------------------------
  function showLogin() {
    loginScreen.hidden = false;
    appShell.hidden = true;
    stopPolling();
  }

  function showApp() {
    loginScreen.hidden = true;
    appShell.hidden = false;
    if ($('#user-label')) $('#user-label').textContent = Auth.getUser();
    bootDashboard();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;

    loginSubmit.disabled = true;
    loginSubmit.querySelector('.btn-label').hidden = true;
    loginSubmit.querySelector('.btn-spinner').hidden = false;

    try {
      const res = await Api.login(username, password);
      const token = res.token || res.access_token || res.jwt;
      if (!token) throw new ApiError('Respons login tidak berisi token.', 500);
      Auth.setToken(token);
      Auth.setUser(username);
      showApp();
    } catch (err) {
      loginError.textContent = err.status === 401
        ? 'Username atau password salah.'
        : err.message;
      loginError.hidden = false;
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.querySelector('.btn-label').hidden = false;
      loginSubmit.querySelector('.btn-spinner').hidden = true;
    }
  });

  if ($('#logout-btn')) {
    $('#logout-btn').addEventListener('click', () => {
      Auth.clearToken();
      loginForm.reset();
      showLogin();
      toast('Anda telah keluar.');
    });
  }

  // ---------------------------------------------------------------
  // Global 401 handling helper
  // ---------------------------------------------------------------
  function handleApiError(err, fallbackMsg) {
    if (err.status === 401) {
      toast('Sesi berakhir. Silakan masuk kembali.', 'error');
      Auth.clearToken();
      showLogin();
      return;
    }
    if (err.status === 429) {
      toast(err.message, 'warn');
      return;
    }
    toast(err.message || fallbackMsg, 'error');
  }

  // ---------------------------------------------------------------
  // Dashboard bootstrap
  // ---------------------------------------------------------------
  async function bootDashboard() {
    await Promise.all([loadStats(), loadRecords()]);
    startPolling();
  }

  function startPolling() {
    stopPolling();
    pollHandle = setInterval(() => {
      loadStats();
      loadRecords(true);
    }, 30000);
  }
  function stopPolling() {
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = null;
  }

  if ($('#refresh-btn')) {
    $('#refresh-btn').addEventListener('click', async () => {
      await Promise.all([loadStats(), loadRecords()]);
      toast('Data diperbarui.');
    });
  }

  // ---------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------
  async function loadStats() {
    try {
      const stats = await Api.getStats();
      if ($('#stat-revenue')) $('#stat-revenue').textContent = fmtCurrency(stats.total_revenue);
      if ($('#stat-records')) $('#stat-records').textContent = stats.total_records ?? '—';
      if ($('#stat-mem')) $('#stat-mem').textContent = `${fmtNum(stats.alloc_memory_mb)} / ${fmtNum(stats.sys_memory_mb)} MB`;
      if ($('#stat-goroutines')) $('#stat-goroutines').textContent = `${stats.num_goroutines ?? '—'} goroutines`;
      if ($('#stat-uptime')) $('#stat-uptime').textContent = stats.uptime || '—';
      if ($('#conn-status')) $('#conn-status').innerHTML = '<span class="signal-dot dot-sm"></span> API online';
    } catch (err) {
      if ($('#conn-status')) $('#conn-status').innerHTML = '<span class="signal-dot dot-sm" style="background:var(--danger)"></span> API bermasalah';
      handleApiError(err, 'Gagal memuat statistik.');
    }
  }

  // ---------------------------------------------------------------
  // Records: load / render / search
  // ---------------------------------------------------------------
  async function loadRecords(silent = false) {
    try {
      const data = await Api.getRecords();
      allRecords = Array.isArray(data) ? data : (data.records || data.data || []);
      const uniqueUsers = new Set(allRecords.map(r => r.user)).size;
      if ($('#stat-users-foot')) $('#stat-users-foot').textContent = `${uniqueUsers} pengguna unik`;
      applyFilterAndRender();
      if (typeof renderCharts === 'function') renderCharts(allRecords);
    } catch (err) {
      if (!silent) handleApiError(err, 'Gagal memuat records.');
    }
  }

  function applyFilterAndRender() {
    const q = $('#search-input') ? $('#search-input').value.trim().toLowerCase() : '';
    const filtered = q
      ? allRecords.filter(r =>
          (r.site_name || '').toLowerCase().includes(q) ||
          (r.user || '').toLowerCase().includes(q))
      : allRecords;
    renderTable(filtered);
  }

  function renderTable(records) {
    const tbody = $('#records-tbody');
    if (!tbody) return;
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Belum ada record. Tambahkan satu atau generate seed data.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map(r => `
      <tr data-id="${r.id}">
        <td>${r.id}</td>
        <td class="cell-site">${escapeHtml(r.site_name)}</td>
        <td class="cell-revenue">${fmtCurrency(r.revenue)}</td>
        <td>${escapeHtml(r.user)}</td>
        <td><span class="cell-payload" title="${escapeHtml(r.payload || '')}">${escapeHtml(r.payload || '—')}</span></td>
        <td class="cell-created">${escapeHtml(r.created_at || '—')}</td>
        <td><button class="row-del-btn" data-id="${r.id}">Hapus</button></td>
      </tr>
    `).join('');
  }

  if ($('#search-input')) $('#search-input').addEventListener('input', applyFilterAndRender);

  if ($('#records-tbody')) {
    $('#records-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.row-del-btn');
      if (!btn) return;
      pendingDeleteId = btn.dataset.id;

      // Pastikan modal tambah tertutup jika ada
      closeAddModal();

      if ($('#confirm-text')) $('#confirm-text').textContent = `Hapus record #${pendingDeleteId}? Tindakan ini tidak dapat dibatalkan.`;
      if ($('#confirm-backdrop')) $('#confirm-backdrop').hidden = false;
    });
  }

  // ---------------------------------------------------------------
  // Delete confirm modal
  // ---------------------------------------------------------------
  function closeConfirm() {
    if ($('#confirm-backdrop')) $('#confirm-backdrop').hidden = true;
    pendingDeleteId = null;
  }

  if ($('#confirm-close')) $('#confirm-close').addEventListener('click', closeConfirm);
  if ($('#confirm-cancel')) $('#confirm-cancel').addEventListener('click', closeConfirm);
  if ($('#confirm-backdrop')) {
    $('#confirm-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'confirm-backdrop') closeConfirm();
    });
  }

  if ($('#confirm-ok')) {
    $('#confirm-ok').addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      const id = pendingDeleteId;
      const okBtn = $('#confirm-ok');
      okBtn.disabled = true;
      try {
        await Api.deleteRecord(id);
        toast(`Record #${id} dihapus.`);
        closeConfirm();
        await Promise.all([loadStats(), loadRecords()]);
      } catch (err) {
        handleApiError(err, 'Gagal menghapus record.');
      } finally {
        okBtn.disabled = false;
      }
    });
  }

  // ---------------------------------------------------------------
  // Add record modal
  // ---------------------------------------------------------------
  const recordForm = $('#record-form');
  const formError = $('#form-error');

  function openAddModal() {
    closeConfirm(); // Tutup modal hapus jika terbuka
    if (recordForm) recordForm.reset();
    if (formError) formError.hidden = true;
    if ($('#modal-backdrop')) $('#modal-backdrop').hidden = false;
    setTimeout(() => { if ($('#f-site-name')) $('#f-site-name').focus(); }, 50);
  }

  function closeAddModal() {
    if ($('#modal-backdrop')) $('#modal-backdrop').hidden = true;
    if (recordForm) recordForm.reset();
    if (formError) formError.hidden = true;
  }

  if ($('#add-record-btn')) $('#add-record-btn').addEventListener('click', openAddModal);
  if ($('#modal-close')) $('#modal-close').addEventListener('click', closeAddModal);
  if ($('#modal-cancel')) $('#modal-cancel').addEventListener('click', closeAddModal);
  if ($('#modal-backdrop')) {
    $('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeAddModal();
    });
  }

  if (recordForm) {
    recordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (formError) formError.hidden = true;

      const site_name = $('#f-site-name').value.trim();
      const revenueRaw = $('#f-revenue').value;
      const user = $('#f-user').value.trim();
      const payloadRaw = $('#f-payload').value.trim();

      // ---- client-side validation ----
      if (site_name.length === 0 || site_name.length > 100) {
        return showFormError('Site name wajib diisi, maksimal 100 karakter.');
      }
      const revenue = Number(revenueRaw);
      if (Number.isNaN(revenue) || revenue < 0 || revenue > 1000000000) {
        return showFormError('Revenue harus berupa angka antara 0 dan 1.000.000.000.');
      }
      if (user.length === 0 || user.length > 50) {
        return showFormError('User wajib diisi, maksimal 50 karakter.');
      }
      let payload = payloadRaw;
      if (payload) {
        try { JSON.parse(payload); } catch (_) { return showFormError('Payload harus berupa JSON yang valid.'); }
        if (new Blob([payload]).size > 50 * 1024) return showFormError('Payload maksimal 50KB.');
      }

      const submitBtn = recordForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await Api.createRecord({ site_name, revenue, user, payload });
        toast('Record baru ditambahkan.');
        closeAddModal();
        await Promise.all([loadStats(), loadRecords()]);
      } catch (err) {
        showFormError(err.message);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function showFormError(msg) {
    if (formError) {
      formError.textContent = msg;
      formError.hidden = false;
    }
  }

  // ---------------------------------------------------------------
  // Seed data
  // ---------------------------------------------------------------
  if ($('#seed-btn')) {
    $('#seed-btn').addEventListener('click', async () => {
      const btn = $('#seed-btn');
      btn.disabled = true;
      try {
        await Api.seed(5);
        toast('5 record dummy berhasil digenerate.');
        await Promise.all([loadStats(), loadRecords()]);
      } catch (err) {
        handleApiError(err, 'Gagal generate seed data.');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------------------------------------------------------------
  // Sidebar nav
  // ---------------------------------------------------------------
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const view = btn.dataset.view;
      if ($('#view-title')) $('#view-title').textContent = view === 'records' ? 'Records' : 'Dashboard';
      if (view === 'records' && $('#records-panel')) {
        $('#records-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function fmtCurrency(n) {
    const v = Number(n || 0);
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtNum(n) {
    return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  const signalLines = [
    '&gt; establishing secure channel...',
    '&gt; handshake ok — awaiting credentials',
    '&gt; standing by...'
  ];
  let sIdx = 0;
  setInterval(() => {
    sIdx = (sIdx + 1) % signalLines.length;
    const term = $('#signal-term');
    if (term) term.innerHTML = `<p>${signalLines[sIdx]}</p>`;
  }, 2600);

  if (Auth.isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
})();