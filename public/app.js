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

  const dashboardView = document.getElementById('dashboard-view');
  const learningView = document.getElementById('learning-view');

  const learningBtn = document.getElementById('learning-btn');
  const backDashboardBtn = document.getElementById('back-dashboard-btn');

  const learningRefreshBtn =
    document.getElementById('learning-refresh-btn');

  const learningSearch =
    document.getElementById('learning-search');

  const learningTabs =
    document.querySelectorAll('.learning-tab');

  const learningLoading =
    document.getElementById('learning-loading');

  const learningError =
    document.getElementById('learning-error');

  const learningErrorDetail =
    document.getElementById('learning-error-detail');

  const learningRetryBtn =
    document.getElementById('learning-retry-btn');

  const learningEmpty =
    document.getElementById('learning-empty');

  const learningKnowledgeList =
    document.getElementById('learning-knowledge-list');

  const learningGamesList =
    document.getElementById('learning-games-list');

  const learningDetailModal =
    document.getElementById('learning-detail-modal');

  const learningDetailBody =
    document.getElementById('learning-detail-body');

  const learningDetailClose =
    document.getElementById('learning-detail-close');

  const learningDetailBackdrop =
    learningDetailModal.querySelector('.learning-modal-backdrop');

  let currentStatus = '';
  let pollTimer = null;
  let searchDebounce = null;

  let currentView = 'dashboard';

  let learningData = {
    totals: {},
    knowledge: [],
    games: []
  };

  let currentLearningTab = 'knowledge';

  // ============================================================
  // AUTH
  // ============================================================

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check', {
        credentials: 'include'
      });

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

    currentView = 'dashboard';
  }

  function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');

    showDashboardView();

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

    loginBtn
      .querySelector('.btn-text')
      .classList.add('hidden');

    loginBtn
      .querySelector('.btn-loading')
      .classList.remove('hidden');

    loginError.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || 'Đăng nhập thất bại'
        );
      }

      passwordInput.value = '';

      showDashboard();
    } catch (err) {
      loginError.textContent =
        err.message || 'Sai mật khẩu hoặc lỗi mạng';

      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;

      loginBtn
        .querySelector('.btn-text')
        .classList.remove('hidden');

      loginBtn
        .querySelector('.btn-loading')
        .classList.add('hidden');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}

    showLogin();
  });

  // ============================================================
  // VIEW NAVIGATION
  // ============================================================

  function showDashboardView() {
    currentView = 'dashboard';

    dashboardView.classList.remove('hidden');
    learningView.classList.add('hidden');

    learningBtn.classList.remove('hidden');
    backDashboardBtn.classList.add('hidden');

    startPolling();
  }

  async function showLearningView() {
    currentView = 'learning';

    dashboardView.classList.add('hidden');
    learningView.classList.remove('hidden');

    learningBtn.classList.add('hidden');
    backDashboardBtn.classList.remove('hidden');

    stopPolling();

    await loadLearning();
  }

  learningBtn.addEventListener('click', showLearningView);

  backDashboardBtn.addEventListener(
    'click',
    showDashboardView
  );

  // ============================================================
  // NORMAL DASHBOARD DATA
  // ============================================================

  function formatTime(ts) {
    if (!ts) return '—';

    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;

    if (diff < 60000) {
      return 'Vừa xong';
    }

    if (diff < 3600000) {
      return (
        Math.floor(diff / 60000) +
        ' phút trước'
      );
    }

    if (diff < 86400000) {
      return (
        Math.floor(diff / 3600000) +
        ' giờ trước'
      );
    }

    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showState(state) {
    loadingState.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    brainList.classList.add('hidden');

    if (state === 'loading') {
      loadingState.classList.remove('hidden');
    } else if (state === 'empty') {
      emptyState.classList.remove('hidden');
    } else if (state === 'error') {
      errorState.classList.remove('hidden');
    } else if (state === 'list') {
      brainList.classList.remove('hidden');
    }
  }

  async function loadBrains() {
    if (currentView !== 'dashboard') {
      return;
    }

    showState('loading');

    const q = searchInput.value.trim();

    const params = new URLSearchParams();

    if (q) {
      params.set('q', q);
    }

    if (currentStatus) {
      params.set('status', currentStatus);
    }

    try {
      const res = await fetch(
        '/api/brains?' + params.toString(),
        {
          credentials: 'include'
        }
      );

      if (res.status === 401) {
        showLogin();
        return;
      }

      if (!res.ok) {
        throw new Error(
          'Server error ' + res.status
        );
      }

      const data = await res.json();

      document.getElementById(
        'stat-total'
      ).textContent = data.total ?? 0;

      document.getElementById(
        'stat-online'
      ).textContent = data.online ?? 0;

      document.getElementById(
        'stat-offline'
      ).textContent = data.offline ?? 0;

      if (
        !data.brains ||
        data.brains.length === 0
      ) {
        showState('empty');
        return;
      }

      brainList.innerHTML =
        data.brains
          .map(renderBrainCard)
          .join('');

      showState('list');

      brainList
        .querySelectorAll('.brain-card')
        .forEach((card) => {
          card.addEventListener(
            'click',
            () => openDetail(
              card.dataset.id
            )
          );
        });

    } catch (err) {
      errorDetail.textContent =
        err.message;

      showState('error');
    }
  }

  function renderBrainCard(b) {
    const name =
      b.displayName ||
      b.originalName ||
      b.userId ||
      'Unknown';

    const statusClass =
      b.status === 'online'
        ? 'online'
        : 'offline';

    const statusText =
      b.status === 'online'
        ? 'Online'
        : 'Offline';

    return `
      <div
        class="brain-card"
        data-id="${escapeHtml(b.brainId)}"
      >
        <div class="brain-top">
          <div class="brain-name">
            ${escapeHtml(name)}
          </div>

          <div class="brain-status ${statusClass}">
            <span class="dot"></span>
            ${statusText}
          </div>
        </div>

        <div class="brain-meta">
          <span>
            ID:
            ${escapeHtml(
              (b.brainId || '').slice(0, 12)
            )}…
          </span>

          <span>
            User:
            ${escapeHtml(b.userId || '—')}
          </span>

          <span>
            v${escapeHtml(
              b.brainVersion || '?'
            )}
          </span>

          <span>
            ${formatTime(b.lastSeen)}
          </span>
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
      const res = await fetch(
        '/api/brains/' +
        encodeURIComponent(brainId),
        {
          credentials: 'include'
        }
      );

      if (res.status === 401) {
        showLogin();
        return;
      }

      if (!res.ok) {
        throw new Error('Not found');
      }

      const b = await res.json();

      const skillsHtml =
        b.skills &&
        b.skills.length
          ? `
            <div class="skills-list">
              ${b.skills
                .map(
                  s =>
                    `<span class="skill-tag">
                      ${escapeHtml(s)}
                    </span>`
                )
                .join('')}
            </div>
          `
          : '—';

      detailBody.innerHTML = `
        <h3
          style="
            margin-bottom:16px;
            font-size:18px;
          "
        >
          ${escapeHtml(
            b.displayName ||
            b.originalName ||
            'Brain'
          )}
        </h3>

        <div class="detail-row">
          <span class="detail-label">
            Brain ID
          </span>
          <span class="detail-value">
            ${escapeHtml(b.brainId)}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            User ID
          </span>
          <span class="detail-value">
            ${escapeHtml(b.userId)}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Display Name
          </span>
          <span class="detail-value">
            ${escapeHtml(
              b.displayName || '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Original Name
          </span>
          <span class="detail-value">
            ${escapeHtml(
              b.originalName || '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Status
          </span>
          <span class="detail-value">
            <span
              class="brain-status ${
                b.status === 'online'
                  ? 'online'
                  : 'offline'
              }"
            >
              <span class="dot"></span>
              ${
                b.status === 'online'
                  ? 'Online'
                  : 'Offline'
              }
            </span>
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Version
          </span>
          <span class="detail-value">
            ${escapeHtml(
              b.brainVersion || '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Created
          </span>
          <span class="detail-value">
            ${formatTime(b.createdAt)}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Last Seen
          </span>
          <span class="detail-value">
            ${formatTime(b.lastSeen)}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Skills
          </span>
          <span class="detail-value">
            ${skillsHtml}
          </span>
        </div>
      `;

      detailModal.classList.remove('hidden');

    } catch (err) {
      alert(
        'Không tải được chi tiết: ' +
        err.message
      );
    }
  }

  function closeModal() {
    detailModal.classList.add('hidden');
  }

  modalClose.addEventListener(
    'click',
    closeModal
  );

  modalBackdrop.addEventListener(
    'click',
    closeModal
  );

  // ============================================================
  // SEARCH / FILTER
  // ============================================================

  searchInput.addEventListener(
    'input',
    () => {
      clearTimeout(searchDebounce);

      searchDebounce =
        setTimeout(
          loadBrains,
          300
        );
    }
  );

  filterBtns.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        filterBtns.forEach(
          b =>
            b.classList.remove('active')
        );

        btn.classList.add('active');

        currentStatus =
          btn.dataset.status || '';

        loadBrains();
      }
    );
  });

  retryBtn.addEventListener(
    'click',
    loadBrains
  );

  // ============================================================
  // LEARNING
  // ============================================================

  function showLearningState(
    state
  ) {
    learningLoading.classList.add(
      'hidden'
    );

    learningError.classList.add(
      'hidden'
    );

    learningEmpty.classList.add(
      'hidden'
    );

    learningKnowledgeList.classList.add(
      'hidden'
    );

    learningGamesList.classList.add(
      'hidden'
    );

    if (state === 'loading') {
      learningLoading.classList.remove(
        'hidden'
      );
    }

    if (state === 'error') {
      learningError.classList.remove(
        'hidden'
      );
    }

    if (state === 'empty') {
      learningEmpty.classList.remove(
        'hidden'
      );
    }

    if (state === 'knowledge') {
      learningKnowledgeList.classList.remove(
        'hidden'
      );
    }

    if (state === 'games') {
      learningGamesList.classList.remove(
        'hidden'
      );
    }
  }

  async function loadLearning() {
    showLearningState('loading');

    try {
      const res = await fetch(
        '/api/dashboard/learning',
        {
          credentials: 'include'
        }
      );

      if (res.status === 401) {
        showLogin();
        return;
      }

      if (!res.ok) {
        throw new Error(
          'Server error ' + res.status
        );
      }

      const data =
        await res.json();

      learningData = {
        totals:
          data.totals || {},

        knowledge:
          Array.isArray(
            data.knowledge
          )
            ? data.knowledge
            : [],

        games:
          Array.isArray(
            data.games
          )
            ? data.games
            : []
      };

      updateLearningStats();

      renderCurrentLearningTab();

    } catch (err) {
      learningErrorDetail.textContent =
        err.message ||
        'Không thể tải dữ liệu Learning';

      showLearningState('error');
    }
  }

  function updateLearningStats() {
    const totals =
      learningData.totals || {};

    document.getElementById(
      'learning-total'
    ).textContent =
      totals.knowledge ?? 0;

    document.getElementById(
      'learning-games'
    ).textContent =
      totals.games ?? 0;

    document.getElementById(
      'learning-candidates'
    ).textContent =
      totals.candidateKnowledge ?? 0;

    document.getElementById(
      'learning-events'
    ).textContent =
      totals.learningEvents ?? 0;
  }

  function renderCurrentLearningTab() {
    const query =
      learningSearch.value
        .trim()
        .toLowerCase();

    if (
      currentLearningTab ===
      'knowledge'
    ) {
      const list =
        learningData.knowledge.filter(
          item => {
            if (!query) {
              return true;
            }

            const text = [
              item.topic,
              item.lesson,
              item.game?.name,
              item.visibility
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return text.includes(
              query
            );
          }
        );

      if (!list.length) {
        showLearningState('empty');
        return;
      }

      learningKnowledgeList.innerHTML =
        list
          .map(
            renderKnowledgeCard
          )
          .join('');

      showLearningState(
        'knowledge'
      );

      learningKnowledgeList
        .querySelectorAll(
          '.learning-card'
        )
        .forEach(card => {
          card.addEventListener(
            'click',
            () =>
              openLearningDetail(
                'knowledge',
                Number(
                  card.dataset.index
                )
              )
          );
        });

      return;
    }

    const games =
      learningData.games.filter(
        game => {
          if (!query) {
            return true;
          }

          const text = [
            game.name,
            game.description,
            game.learningStatus
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return text.includes(
            query
          );
        }
      );

    if (!games.length) {
      showLearningState('empty');
      return;
    }

    learningGamesList.innerHTML =
      games
        .map(
          renderGameLearningCard
        )
        .join('');

    showLearningState('games');

    learningGamesList
      .querySelectorAll(
        '.learning-card'
      )
      .forEach(card => {
        card.addEventListener(
          'click',
          () =>
            openLearningDetail(
              'game',
              Number(
                card.dataset.index
              )
            )
        );
      });
  }

  function renderKnowledgeCard(
    item,
    index
  ) {
    const confidence =
      Math.round(
        Number(
          item.confidence || 0
        ) * 100
      );

    const verified =
      item.verified === true;

    return `
      <article
        class="learning-card"
        data-index="${index}"
      >
        <div class="learning-card-top">
          <div>
            <h3>
              ${escapeHtml(
                item.topic ||
                'Không có topic'
              )}
            </h3>

            <p class="learning-card-subtitle">
              ${escapeHtml(
                item.lesson ||
                'Chưa có mô tả'
              )}
            </p>
          </div>

          <span
            class="learning-badge ${
              verified
                ? 'verified'
                : 'candidate'
            }"
          >
            ${
              verified
                ? '✓ Verified'
                : 'Candidate'
            }
          </span>
        </div>

        <div class="learning-card-meta">
          <span>
            Confidence:
            ${confidence}%
          </span>

          <span>
            Evidence:
            ${Number(
              item.evidenceCount || 0
            )}
          </span>

          <span>
            ${
              item.game?.name
                ? escapeHtml(
                    item.game.name
                  )
                : 'System'
            }
          </span>
        </div>

        <div class="learning-progress">
          <div
            class="learning-progress-fill"
            style="width:${Math.min(
              100,
              Math.max(0, confidence)
            )}%"
          ></div>
        </div>
      </article>
    `;
  }

  function renderGameLearningCard(
    game,
    index
  ) {
    const score =
      Number(
        game.learningScore || 0
      );

    const status =
      game.learningStatus ||
      'discovered';

    return `
      <article
        class="learning-card game-learning-card"
        data-index="${index}"
      >
        ${
          game.iconUrl
            ? `
              <img
                class="learning-game-icon"
                src="${escapeHtml(
                  game.iconUrl
                )}"
                alt=""
                loading="lazy"
              />
            `
            : `
              <div class="learning-game-icon-placeholder">
                🎮
              </div>
            `
        }

        <div class="learning-game-info">
          <div class="learning-card-top">
            <div>
              <h3>
                ${escapeHtml(
                  game.name ||
                  'Unknown Game'
                )}
              </h3>

              <p class="learning-card-subtitle">
                ${escapeHtml(
                  game.description ||
                  'Chưa có mô tả.'
                )}
              </p>
            </div>

            <span class="learning-badge">
              ${escapeHtml(
                status
              )}
            </span>
          </div>

          <div class="learning-card-meta">
            <span>
              Score:
              ${score}%
            </span>

            <span>
              Knowledge:
              ${Number(
                game.verifiedKnowledgeCount ||
                0
              )}
            </span>

            <span>
              Visits:
              ${Number(
                game.totalVisits || 0
              )}
            </span>
          </div>

          <div class="learning-progress">
            <div
              class="learning-progress-fill"
              style="width:${Math.min(
                100,
                Math.max(0, score)
              )}%"
            ></div>
          </div>
        </div>
      </article>
    `;
  }

  function openLearningDetail(
    type,
    index
  ) {
    let item;

    if (type === 'knowledge') {
      item =
        learningData.knowledge[
          index
        ];
    } else {
      item =
        learningData.games[
          index
        ];
    }

    if (!item) return;

    if (type === 'knowledge') {
      const confidence =
        Math.round(
          Number(
            item.confidence || 0
          ) * 100
        );

      learningDetailBody.innerHTML = `
        <div class="learning-detail">
          <div class="learning-detail-title">
            <span>📚</span>

            <div>
              <h2>
                ${escapeHtml(
                  item.topic ||
                  'Knowledge'
                )}
              </h2>

              <p>
                ${
                  item.verified
                    ? '✓ Verified knowledge'
                    : 'Candidate knowledge'
                }
              </p>
            </div>
          </div>

          <div class="learning-detail-section">
            <h3>Lesson</h3>

            <p>
              ${escapeHtml(
                item.lesson ||
                'Không có lesson.'
              )}
            </p>
          </div>

          <div class="learning-detail-grid">

            <div>
              <span>Confidence</span>
              <strong>
                ${confidence}%
              </strong>
            </div>

            <div>
              <span>Evidence</span>
              <strong>
                ${Number(
                  item.evidenceCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Visibility</span>
              <strong>
                ${escapeHtml(
                  item.visibility ||
                  '—'
                )}
              </strong>
            </div>

            <div>
              <span>Game</span>
              <strong>
                ${escapeHtml(
                  item.game?.name ||
                  'System'
                )}
              </strong>
            </div>

          </div>

          <div class="learning-detail-section">
            <h3>Timeline</h3>

            <p>
              Created:
              ${formatTime(
                item.createdAt
              )}
            </p>

            <p>
              Updated:
              ${formatTime(
                item.updatedAt
              )}
            </p>
          </div>
        </div>
      `;

    } else {
      learningDetailBody.innerHTML = `
        <div class="learning-detail">

          <div class="learning-detail-title">
            <span>🎮</span>

            <div>
              <h2>
                ${escapeHtml(
                  item.name ||
                  'Unknown Game'
                )}
              </h2>

              <p>
                ${escapeHtml(
                  item.learningStatus ||
                  'discovered'
                )}
              </p>
            </div>
          </div>

          ${
            item.thumbnailUrl
              ? `
                <img
                  class="learning-detail-thumbnail"
                  src="${escapeHtml(
                    item.thumbnailUrl
                  )}"
                  alt=""
                />
              `
              : ''
          }

          <div class="learning-detail-section">
            <h3>Description</h3>

            <p>
              ${escapeHtml(
                item.description ||
                'Chưa có mô tả.'
              )}
            </p>
          </div>

          <div class="learning-detail-grid">

            <div>
              <span>Learning Score</span>
              <strong>
                ${Number(
                  item.learningScore ||
                  0
                )}%
              </strong>
            </div>

            <div>
              <span>Knowledge</span>
              <strong>
                ${Number(
                  item.verifiedKnowledgeCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Candidate</span>
              <strong>
                ${Number(
                  item.candidateKnowledgeCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Observations</span>
              <strong>
                ${Number(
                  item.observations ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Brains</span>
              <strong>
                ${Number(
                  item.brainCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Players</span>
              <strong>
                ${Number(
                  item.playerCount ||
                  0
                )}
              </strong>
            </div>

          </div>

          <div class="learning-detail-section">
            <h3>Game IDs</h3>

            <p>
              Place ID:
              ${escapeHtml(
                item.placeId ||
                '—'
              )}
            </p>

            <p>
              Universe ID:
              ${escapeHtml(
                item.universeId ||
                '—'
              )}
            </p>
          </div>

        </div>
      `;
    }

    learningDetailModal.classList.remove(
      'hidden'
    );
  }

  function closeLearningDetail() {
    learningDetailModal.classList.add(
      'hidden'
    );
  }

  learningDetailClose.addEventListener(
    'click',
    closeLearningDetail
  );

  learningDetailBackdrop.addEventListener(
    'click',
    closeLearningDetail
  );

  learningRefreshBtn.addEventListener(
    'click',
    loadLearning
  );

  learningRetryBtn.addEventListener(
    'click',
    loadLearning
  );

  learningSearch.addEventListener(
    'input',
    renderCurrentLearningTab
  );

  learningTabs.forEach(
    tab => {
      tab.addEventListener(
        'click',
        () => {
          learningTabs.forEach(
            t =>
              t.classList.remove(
                'active'
              )
          );

          tab.classList.add(
            'active'
          );

          currentLearningTab =
            tab.dataset.learningTab;

          renderCurrentLearningTab();
        }
      );
    }
  );

  // ============================================================
  // POLLING
  // ============================================================

  function startPolling() {
    stopPolling();

    if (
      currentView !==
      'dashboard'
    ) {
      return;
    }

    pollTimer =
      setInterval(
        loadBrains,
        8000
      );
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(
        pollTimer
      );

      pollTimer = null;
    }
  }

  // ============================================================
  // INIT
  // ============================================================

  init();

})();
