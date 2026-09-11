(function () {
  const loginScreen = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const brainList = document.getElementById('brain-list');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const errorDetail = document.getElementById('error-detail');
  const retryBtn = document.getElementById('retry-btn');
  const detailModal = document.getElementById('detail-modal');
  const detailBody = document.getElementById('detail-body');
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = detailModal.querySelector('.modal-backdrop');

  let currentStatus = '';
  let pollTimer = null;
  let searchDebounce = null;

  // ===== AUTH =====
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' });
      const data = await res.json();
      return !!data.authenticated;
    } catch {
      return false;
    }
  }

  function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    stopPolling();
  }

  function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadBrains();
    startPolling();
  }

  async function init() {
    const authed = await checkAuth();
    if (authed) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    if (!password) return;

    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').classList.add('hidden');
    loginBtn.querySelector('.btn-loading').classList.remove('hidden');
    loginError.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      passwordInput.value = '';
      showDashboard();
    } catch (err) {
      loginError.textContent = err.message || 'Sai mật khẩu hoặc lỗi mạng';
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').classList.remove('hidden');
      loginBtn.querySelector('.btn-loading').classList.add('hidden');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    showLogin();
  });

  // ===== DATA =====
  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' phút trước';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' giờ trước';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function showState(state) {
    loadingState.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    brainList.classList.add('hidden');
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'empty') emptyState.classList.remove('hidden');
    else if (state === 'error') errorState.classList.remove('hidden');
    else if (state === 'list') brainList.classList.remove('hidden');
  }

  async function loadBrains() {
    showState('loading');
    const q = searchInput.value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (currentStatus) params.set('status', currentStatus);

    try {
      const res = await fetch('/api/brains?' + params.toString(), {
        credentials: 'include',
      });

      if (res.status === 401) {
        showLogin();
        return;
      }

      if (!res.ok) {
        throw new Error('Server error ' + res.status);
      }

      const data = await res.json();

      document.getElementById('stat-total').textContent = data.total ?? 0;
      document.getElementById('stat-online').textContent = data.online ?? 0;
      document.getElementById('stat-offline').textContent = data.offline ?? 0;

      if (!data.brains || data.brains.length === 0) {
        showState('empty');
        return;
      }

      brainList.innerHTML = data.brains.map(renderBrainCard).join('');
      showState('list');

      brainList.querySelectorAll('.brain-card').forEach((card) => {
        card.addEventListener('click', () => openDetail(card.dataset.id));
      });
    } catch (err) {
      errorDetail.textContent = err.message;
      showState('error');
    }
  }

  function renderBrainCard(b) {
    const name = b.displayName || b.originalName || b.userId || 'Unknown';
    const statusClass = b.status === 'online' ? 'online' : 'offline';
    const statusText = b.status === 'online' ? 'Online' : 'Offline';
    return `
      <div class="brain-card" data-id="${escapeHtml(b.brainId)}">
        <div class="brain-top">
          <div class="brain-name">${escapeHtml(name)}</div>
          <div class="brain-status ${statusClass}">
            <span class="dot"></span>
            ${statusText}
          </div>
        </div>
        <div class="brain-meta">
          <span>ID: ${escapeHtml((b.brainId || '').slice(0, 12))}…</span>
          <span>User: ${escapeHtml(b.userId || '—')}</span>
          <span>v${escapeHtml(b.brainVersion || '?')}</span>
          <span>${formatTime(b.lastSeen)}</span>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function openDetail(brainId) {
    try {
      const res = await fetch('/api/brains/' + encodeURIComponent(brainId), {
        credentials: 'include',
      });
      if (res.status === 401) {
        showLogin();
        return;
      }
      if (!res.ok) throw new Error('Not found');
      const b = await res.json();

      const skillsHtml = (b.skills && b.skills.length)
        ? `<div class="skills-list">${b.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>`
        : '—';

      detailBody.innerHTML = `
        <h3 style="margin-bottom:16px;font-size:18px;">${escapeHtml(b.displayName || b.originalName || 'Brain')}</h3>
        <div class="detail-row"><span class="detail-label">Brain ID</span><span class="detail-value">${escapeHtml(b.brainId)}</span></div>
        <div class="detail-row"><span class="detail-label">User ID</span><span class="detail-value">${escapeHtml(b.userId)}</span></div>
        <div class="detail-row"><span class="detail-label">Display Name</span><span class="detail-value">${escapeHtml(b.displayName || '—')}</span></div>
        <div class="detail-row"><span class="detail-label">Original Name</span><span class="detail-value">${escapeHtml(b.originalName || '—')}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="brain-status ${b.status === 'online' ? 'online' : 'offline'}"><span class="dot"></span>${b.status === 'online' ? 'Online' : 'Offline'}</span></span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">${escapeHtml(b.brainVersion || '—')}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${formatTime(b.createdAt)}</span></div>
        <div class="detail-row"><span class="detail-label">Last Seen</span><span class="detail-value">${formatTime(b.lastSeen)}</span></div>
        <div class="detail-row"><span class="detail-label">Skills</span><span class="detail-value">${skillsHtml}</span></div>
      `;
      detailModal.classList.remove('hidden');
    } catch (err) {
      alert('Không tải được chi tiết: ' + err.message);
    }
  }

  function closeModal() {
    detailModal.classList.add('hidden');
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  // Search & filter
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadBrains, 300);
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status || '';
      loadBrains();
    });
  });

  retryBtn.addEventListener('click', loadBrains);

  // Polling every 8s
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(loadBrains, 8000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Init
  init();
})();
