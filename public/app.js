(function () {
  'use strict';

  // ============================================================
  // DOM
  // ============================================================

  const $ = (id) => document.getElementById(id);

  const loginScreen = $('login-screen');
  const dashboard = $('dashboard');
  const loginForm = $('login-form');
  const passwordInput = $('password');
  const loginBtn = $('login-btn');
  const loginError = $('login-error');
  const logoutBtn = $('logout-btn');

  const searchInput = $('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const brainList = $('brain-list');

  const loadingState = $('loading-state');
  const emptyState = $('empty-state');
  const errorState = $('error-state');
  const errorDetail = $('error-detail');
  const retryBtn = $('retry-btn');

  const detailModal = $('detail-modal');
  const detailBody = $('detail-body');
  const modalClose = $('modal-close');

  const dashboardView = $('dashboard-view');
  const learningView = $('learning-view');

  const learningBtn = $('learning-btn');
  const skillsBtn = $('skills-btn');
  const skillsView = $('skills-view');
  const backDashboardBtn = $('back-dashboard-btn');

  const learningRefreshBtn = $('learning-refresh-btn');
  const learningSearch = $('learning-search');
  const learningTabs =
    document.querySelectorAll('[data-learning-tab]');

  const learningLoading = $('learning-loading');
  const learningError = $('learning-error');
  const learningErrorDetail = $('learning-error-detail');
  const learningRetryBtn = $('learning-retry-btn');
  const learningEmpty = $('learning-empty');

  const learningKnowledgeList =
    $('learning-knowledge-list');

  const learningGamesList =
    $('learning-games-list');

  const learningDetailModal =
    $('learning-detail-modal');

  const learningDetailBody =
    $('learning-detail-body');

  const learningDetailClose =
    $('learning-detail-close');

  const skillsRefreshBtn =
    $('skills-refresh-btn');

  const skillsSearch =
    $('skills-search');

  const skillsTabs =
    document.querySelectorAll('[data-skill-tab]');

  const skillsLoading =
    $('skills-loading');

  const skillsError =
    $('skills-error');

  const skillsErrorDetail =
    $('skills-error-detail');

  const skillsRetryBtn =
    $('skills-retry-btn');

  const skillsEmpty =
    $('skills-empty');

  const skillsList =
    $('skills-list');


  // ============================================================
  // STATE
  // ============================================================

  let currentStatus = '';
  let pollTimer = null;
  let searchDebounce = null;

  let currentView = 'dashboard';

  let currentLearningTab = 'knowledge';

  let currentSkillTab = 'all';

  let learningData = {
    totals: {},
    knowledge: [],
    games: []
  };

  let skillsData = [];


  // ============================================================
  // SAFETY
  // ============================================================

  function exists(element) {
    return !!element;
  }

  function safeClass(element, method, className) {
    if (!element) return;

    if (method === 'add') {
      element.classList.add(className);
    }

    if (method === 'remove') {
      element.classList.remove(className);
    }
  }

  function setText(element, value) {
    if (element) {
      element.textContent =
        value == null ? '' : String(value);
    }
  }


  // ============================================================
  // HTML ESCAPE
  // ============================================================

  function escapeHtml(value) {
    if (value == null) return '';

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  // ============================================================
  // FETCH JSON
  // ============================================================

  async function fetchJSON(
    url,
    options = {}
  ) {
    const response = await fetch(url, {
      credentials: 'include',
      ...options
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      showLogin();
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        `Server error ${response.status}`
      );
    }

    return data;
  }


  // ============================================================
  // AUTH
  // ============================================================

  async function checkAuth() {
    try {
      const data = await fetchJSON(
        '/api/auth/check'
      );

      return !!data.authenticated;
    } catch {
      return false;
    }
  }


  function showLogin() {
    safeClass(
      loginScreen,
      'remove',
      'hidden'
    );

    safeClass(
      dashboard,
      'add',
      'hidden'
    );

    stopPolling();

    currentView = 'dashboard';

    closeDetailModal();
    closeLearningDetail();

    if (passwordInput) {
      passwordInput.focus();
    }
  }


  function showDashboard() {
    safeClass(
      loginScreen,
      'add',
      'hidden'
    );

    safeClass(
      dashboard,
      'remove',
      'hidden'
    );

    showDashboardView();

    loadBrains();
  }


  async function init() {
    if (!loginScreen || !dashboard) {
      console.error(
        '[AI Brain Registry] Missing root DOM elements.'
      );
      return;
    }

    const authenticated =
      await checkAuth();

    if (authenticated) {
      showDashboard();
    } else {
      showLogin();
    }
  }


  if (loginForm) {
    loginForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const password =
          passwordInput?.value || '';

        if (!password) {
          return;
        }

        loginBtn.disabled = true;

        const text =
          loginBtn.querySelector(
            '.btn-text'
          );

        const loading =
          loginBtn.querySelector(
            '.btn-loading'
          );

        safeClass(
          text,
          'add',
          'hidden'
        );

        safeClass(
          loading,
          'remove',
          'hidden'
        );

        safeClass(
          loginError,
          'add',
          'hidden'
        );

        try {
          await fetchJSON(
            '/api/auth/login',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                password
              })
            }
          );

          passwordInput.value = '';

          showDashboard();

        } catch (error) {
          if (
            error.message !==
            'UNAUTHORIZED'
          ) {
            setText(
              loginError,
              error.message ||
                'Sai mật khẩu hoặc lỗi mạng'
            );

            safeClass(
              loginError,
              'remove',
              'hidden'
            );
          }

        } finally {
          loginBtn.disabled = false;

          safeClass(
            text,
            'remove',
            'hidden'
          );

          safeClass(
            loading,
            'add',
            'hidden'
          );
        }
      }
    );
  }


  if (logoutBtn) {
    logoutBtn.addEventListener(
      'click',
      async () => {
        try {
          await fetch(
            '/api/auth/logout',
            {
              method: 'POST',
              credentials: 'include'
            }
          );
        } catch {}

        showLogin();
      }
    );
  }


  // ============================================================
  // VIEW NAVIGATION
  // ============================================================

  function showDashboardView() {
    currentView = 'dashboard';

    safeClass(
      dashboardView,
      'remove',
      'hidden'
    );

    safeClass(
      learningView,
      'add',
      'hidden'
    );

    safeClass(
      skillsView,
      'add',
      'hidden'
    );

    safeClass(
      learningBtn,
      'remove',
      'hidden'
    );

    safeClass(
      skillsBtn,
      'remove',
      'hidden'
    );

    safeClass(
      backDashboardBtn,
      'add',
      'hidden'
    );

    startPolling();
  }


  async function showLearningView() {
    currentView = 'learning';

    safeClass(
      dashboardView,
      'add',
      'hidden'
    );

    safeClass(
      learningView,
      'remove',
      'hidden'
    );

    safeClass(
      skillsView,
      'add',
      'hidden'
    );

    safeClass(
      learningBtn,
      'add',
      'hidden'
    );

    safeClass(
      skillsBtn,
      'remove',
      'hidden'
    );

    safeClass(
      backDashboardBtn,
      'remove',
      'hidden'
    );

    stopPolling();

    await loadLearning();
  }


  function showSkillsView() {
    currentView = 'skills';

    safeClass(
      dashboardView,
      'add',
      'hidden'
    );

    safeClass(
      learningView,
      'add',
      'hidden'
    );

    safeClass(
      skillsView,
      'remove',
      'hidden'
    );

    safeClass(
      learningBtn,
      'remove',
      'hidden'
    );

    safeClass(
      skillsBtn,
      'add',
      'hidden'
    );

    safeClass(
      backDashboardBtn,
      'remove',
      'hidden'
    );

    stopPolling();

    loadSkills();
  }


  if (learningBtn) {
    learningBtn.addEventListener(
      'click',
      showLearningView
    );
  }


  if (skillsBtn) {
    skillsBtn.addEventListener(
      'click',
      showSkillsView
    );
  }


  if (backDashboardBtn) {
    backDashboardBtn.addEventListener(
      'click',
      showDashboardView
    );
  }


  // ============================================================
  // NORMAL DASHBOARD
  // ============================================================

  function formatTime(timestamp) {
    if (!timestamp) {
      return '—';
    }

    const numeric =
      typeof timestamp === 'number'
        ? timestamp
        : Date.parse(timestamp);

    if (!Number.isFinite(numeric)) {
      return '—';
    }

    const date =
      new Date(numeric);

    const now =
      Date.now();

    const diff =
      now - numeric;

    if (diff < 60000) {
      return 'Vừa xong';
    }

    if (diff < 3600000) {
      return (
        Math.floor(
          diff / 60000
        ) + ' phút trước'
      );
    }

    if (diff < 86400000) {
      return (
        Math.floor(
          diff / 3600000
        ) + ' giờ trước'
      );
    }

    return date.toLocaleString(
      'vi-VN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  function showBrainState(state) {
    safeClass(
      loadingState,
      'add',
      'hidden'
    );

    safeClass(
      emptyState,
      'add',
      'hidden'
    );

    safeClass(
      errorState,
      'add',
      'hidden'
    );

    safeClass(
      brainList,
      'add',
      'hidden'
    );

    if (state === 'loading') {
      safeClass(
        loadingState,
        'remove',
        'hidden'
      );
    }

    if (state === 'empty') {
      safeClass(
        emptyState,
        'remove',
        'hidden'
      );
    }

    if (state === 'error') {
      safeClass(
        errorState,
        'remove',
        'hidden'
      );
    }

    if (state === 'list') {
      safeClass(
        brainList,
        'remove',
        'hidden'
      );
    }
  }


  async function loadBrains() {
    if (
      currentView !==
      'dashboard'
    ) {
      return;
    }

    showBrainState('loading');

    const query =
      searchInput?.value.trim() ||
      '';

    const params =
      new URLSearchParams();

    if (query) {
      params.set(
        'q',
        query
      );
    }

    if (currentStatus) {
      params.set(
        'status',
        currentStatus
      );
    }

    try {
      const data =
        await fetchJSON(
          '/api/brains?' +
          params.toString()
        );

      setText(
        $('stat-total'),
        data.total ?? 0
      );

      setText(
        $('stat-online'),
        data.online ?? 0
      );

      setText(
        $('stat-offline'),
        data.offline ?? 0
      );

      if (
        Array.isArray(
          data.brains
        ) === false ||
        data.brains.length === 0
      ) {
        brainList.innerHTML = '';
        showBrainState('empty');
        return;
      }

      brainList.innerHTML =
        data.brains
          .map(renderBrainCard)
          .join('');

      showBrainState('list');

      brainList
        .querySelectorAll(
          '.brain-card'
        )
        .forEach(
          (card) => {
            card.addEventListener(
              'click',
              () => {
                openDetail(
                  card.dataset.id
                );
              }
            );
          }
        );

    } catch (error) {
      if (
        error.message ===
        'UNAUTHORIZED'
      ) {
        return;
      }

      setText(
        errorDetail,
        error.message
      );

      showBrainState('error');
    }
  }


  function renderBrainCard(brain) {
    const name =
      brain.displayName ||
      brain.originalName ||
      brain.userId ||
      'Unknown';

    const online =
      brain.status ===
      'online';

    const statusClass =
      online
        ? 'online'
        : 'offline';

    const statusText =
      online
        ? 'Online'
        : 'Offline';

    const brainId =
      brain.brainId || '';

    const shortId =
      brainId.length > 12
        ? brainId.slice(0, 12) +
          '…'
        : brainId;

    return `
      <article
        class="brain-card"
        data-id="${escapeHtml(brainId)}"
      >

        <div class="brain-top">

          <div class="brain-name">
            ${escapeHtml(name)}
          </div>

          <div
            class="brain-status ${statusClass}"
          >
            <span class="dot"></span>
            ${statusText}
          </div>

        </div>

        <div class="brain-meta">

          <span>
            ID:
            ${escapeHtml(shortId)}
          </span>

          <span>
            User:
            ${escapeHtml(
              brain.userId ||
              '—'
            )}
          </span>

          <span>
            v${escapeHtml(
              brain.brainVersion ||
              '?'
            )}
          </span>

          <span>
            ${formatTime(
              brain.lastSeen
            )}
          </span>

        </div>

      </article>
    `;
  }


  // ============================================================
  // BRAIN DETAIL
  // ============================================================

  async function openDetail(brainId) {
    if (!brainId) {
      return;
    }

    try {
      const brain =
        await fetchJSON(
          '/api/brains/' +
          encodeURIComponent(
            brainId
          )
        );

      const skills =
        Array.isArray(
          brain.skills
        )
          ? brain.skills
          : [];

      const skillsHtml =
        skills.length
          ? `
            <div class="chips">
              ${skills
                .map(
                  (skill) =>
                    `<span class="chip">
                      ${escapeHtml(skill)}
                    </span>`
                )
                .join('')}
            </div>
          `
          : '—';

      const online =
        brain.status ===
        'online';

      detailBody.innerHTML = `
        <div class="detail-head">

          <h2>
            ${escapeHtml(
              brain.displayName ||
              brain.originalName ||
              'Brain'
            )}
          </h2>

          <span
            class="brain-status ${
              online
                ? 'online'
                : 'offline'
            }"
          >
            <span class="dot"></span>
            ${
              online
                ? 'Online'
                : 'Offline'
            }
          </span>

        </div>

        <div class="detail-row">
          <span class="detail-label">
            Brain ID
          </span>

          <span class="detail-value">
            ${escapeHtml(
              brain.brainId
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            User ID
          </span>

          <span class="detail-value">
            ${escapeHtml(
              brain.userId
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Display Name
          </span>

          <span class="detail-value">
            ${escapeHtml(
              brain.displayName ||
              '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Original Name
          </span>

          <span class="detail-value">
            ${escapeHtml(
              brain.originalName ||
              '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Version
          </span>

          <span class="detail-value">
            ${escapeHtml(
              brain.brainVersion ||
              '—'
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Created
          </span>

          <span class="detail-value">
            ${formatTime(
              brain.createdAt
            )}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">
            Last Seen
          </span>

          <span class="detail-value">
            ${formatTime(
              brain.lastSeen
            )}
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

      openModal(detailModal);

    } catch (error) {
      if (
        error.message ===
        'UNAUTHORIZED'
      ) {
        return;
      }

      alert(
        'Không tải được chi tiết: ' +
        error.message
      );
    }
  }


  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove(
      'hidden'
    );

    document.body.classList.add(
      'modal-open'
    );
  }


  function closeModal(modal) {
    if (!modal) return;

    modal.classList.add(
      'hidden'
    );

    if (
      !document.querySelector(
        '.modal:not(.hidden)'
      )
    ) {
      document.body.classList.remove(
        'modal-open'
      );
    }
  }


  function closeDetailModal() {
    closeModal(
      detailModal
    );
  }


  if (modalClose) {
    modalClose.addEventListener(
      'click',
      closeDetailModal
    );
  }


  if (detailModal) {
    const backdrop =
      detailModal.querySelector(
        '.modal-backdrop, .backdrop'
      );

    if (backdrop) {
      backdrop.addEventListener(
        'click',
        closeDetailModal
      );
    }
  }


  // ============================================================
  // SEARCH / FILTER
  // ============================================================

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      () => {
        clearTimeout(
          searchDebounce
        );

        searchDebounce =
          setTimeout(
            loadBrains,
            300
          );
      }
    );
  }


  filterBtns.forEach(
    (button) => {
      button.addEventListener(
        'click',
        () => {
          filterBtns.forEach(
            (item) =>
              item.classList.remove(
                'active'
              )
          );

          button.classList.add(
            'active'
          );

          currentStatus =
            button.dataset.status ||
            '';

          loadBrains();
        }
      );
    }
  );


  if (retryBtn) {
    retryBtn.addEventListener(
      'click',
      loadBrains
    );
  }


  // ============================================================
  // LEARNING
  // ============================================================

  function showLearningState(
    state
  ) {
    [
      learningLoading,
      learningError,
      learningEmpty,
      learningKnowledgeList,
      learningGamesList
    ].forEach(
      (element) =>
        safeClass(
          element,
          'add',
          'hidden'
        )
    );

    const target = {
      loading:
        learningLoading,

      error:
        learningError,

      empty:
        learningEmpty,

      knowledge:
        learningKnowledgeList,

      games:
        learningGamesList
    }[state];

    safeClass(
      target,
      'remove',
      'hidden'
    );
  }


  async function loadLearning() {
    showLearningState(
      'loading'
    );

    try {
      const data =
        await fetchJSON(
          '/api/dashboard/learning'
        );

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

    } catch (error) {
      if (
        error.message ===
        'UNAUTHORIZED'
      ) {
        return;
      }

      setText(
        learningErrorDetail,
        error.message ||
          'Không thể tải dữ liệu Learning'
      );

      showLearningState(
        'error'
      );
    }
  }


  function updateLearningStats() {
    const totals =
      learningData.totals ||
      {};

    setText(
      $('learning-total'),
      totals.knowledge ?? 0
    );

    setText(
      $('learning-games'),
      totals.games ?? 0
    );

    setText(
      $('learning-candidates'),
      totals.candidateKnowledge ??
        0
    );

    setText(
      $('learning-events'),
      totals.learningEvents ??
        0
    );
  }


  function getKnowledgeSearchResults() {
    const query =
      learningSearch?.value
        .trim()
        .toLowerCase() ||
      '';

    return learningData.knowledge
      .map(
        (item, originalIndex) => ({
          item,
          originalIndex
        })
      )
      .filter(
        ({
          item
        }) => {
          if (!query) {
            return true;
          }

          const text = [
            item.topic,
            item.lesson,
            item.game?.name,
            item.visibility,
            item.category
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return text.includes(
            query
          );
        }
      );
  }


  function getGameSearchResults() {
    const query =
      learningSearch?.value
        .trim()
        .toLowerCase() ||
      '';

    return learningData.games
      .map(
        (item, originalIndex) => ({
          item,
          originalIndex
        })
      )
      .filter(
        ({
          item
        }) => {
          if (!query) {
            return true;
          }

          const text = [
            item.name,
            item.description,
            item.learningStatus,
            item.placeId,
            item.universeId
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return text.includes(
            query
          );
        }
      );
  }


  function renderCurrentLearningTab() {
    if (
      currentLearningTab ===
      'knowledge'
    ) {
      const results =
        getKnowledgeSearchResults();

      if (!results.length) {
        learningKnowledgeList.innerHTML =
          '';

        showLearningState(
          'empty'
        );

        return;
      }

      learningKnowledgeList.innerHTML =
        results
          .map(
            ({
              item,
              originalIndex
            }) =>
              renderKnowledgeCard(
                item,
                originalIndex
              )
          )
          .join('');

      learningKnowledgeList
        .querySelectorAll(
          '.learning-card'
        )
        .forEach(
          (card) => {
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
          }
        );

      showLearningState(
        'knowledge'
      );

      return;
    }


    const results =
      getGameSearchResults();

    if (!results.length) {
      learningGamesList.innerHTML =
        '';

      showLearningState(
        'empty'
      );

      return;
    }

    learningGamesList.innerHTML =
      results
        .map(
          ({
            item,
            originalIndex
          }) =>
            renderGameLearningCard(
              item,
              originalIndex
            )
        )
        .join('');

    learningGamesList
      .querySelectorAll(
        '.learning-card'
      )
      .forEach(
        (card) => {
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
        }
      );

    showLearningState(
      'games'
    );
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

    const safeConfidence =
      Math.min(
        100,
        Math.max(
          0,
          confidence
        )
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
            ${safeConfidence}%
          </span>

          <span>
            Evidence:
            ${Number(
              item.evidenceCount ||
              0
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
            style="width:${safeConfidence}%"
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

    const safeScore =
      Math.min(
        100,
        Math.max(
          0,
          score
        )
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
              ${safeScore}%
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
                game.totalVisits ||
                0
              )}
            </span>

          </div>

          <div class="learning-progress">

            <div
              class="learning-progress-fill"
              style="width:${safeScore}%"
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
    let item = null;

    if (
      type ===
      'knowledge'
    ) {
      item =
        learningData.knowledge[
          index
        ];
    }

    if (
      type ===
      'game'
    ) {
      item =
        learningData.games[
          index
        ];
    }

    if (!item) {
      return;
    }


    if (
      type ===
      'knowledge'
    ) {
      const confidence =
        Math.round(
          Number(
            item.confidence ||
            0
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

            <h3>
              Lesson
            </h3>

            <p>
              ${escapeHtml(
                item.lesson ||
                'Không có lesson.'
              )}
            </p>

          </div>


          <div class="learning-detail-grid">

            <div>
              <span>
                Confidence
              </span>

              <strong>
                ${confidence}%
              </strong>
            </div>

            <div>
              <span>
                Evidence
              </span>

              <strong>
                ${Number(
                  item.evidenceCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>
                Visibility
              </span>

              <strong>
                ${escapeHtml(
                  item.visibility ||
                  '—'
                )}
              </strong>
            </div>

            <div>
              <span>
                Game
              </span>

              <strong>
                ${escapeHtml(
                  item.game?.name ||
                  'System'
                )}
              </strong>
            </div>

          </div>


          <div class="learning-detail-section">

            <h3>
              Timeline
            </h3>

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
    }


    if (
      type ===
      'game'
    ) {
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

            <h3>
              Description
            </h3>

            <p>
              ${escapeHtml(
                item.description ||
                'Chưa có mô tả.'
              )}
            </p>

          </div>


          <div class="learning-detail-grid">

            <div>
              <span>
                Learning Score
              </span>

              <strong>
                ${Number(
                  item.learningScore ||
                  0
                )}%
              </strong>
            </div>

            <div>
              <span>
                Knowledge
              </span>

              <strong>
                ${Number(
                  item.verifiedKnowledgeCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>
                Candidate
              </span>

              <strong>
                ${Number(
                  item.candidateKnowledgeCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>
                Observations
              </span>

              <strong>
                ${Number(
                  item.observations ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>
                Brains
              </span>

              <strong>
                ${Number(
                  item.brainCount ||
                  0
                )}
              </strong>
            </div>

            <div>
              <span>
                Players
              </span>

              <strong>
                ${Number(
                  item.playerCount ||
                  0
                )}
              </strong>
            </div>

          </div>


          <div class="learning-detail-section">

            <h3>
              Game IDs
            </h3>

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

    openModal(
      learningDetailModal
    );
  }


  function closeLearningDetail() {
    closeModal(
      learningDetailModal
    );
  }


  if (learningDetailClose) {
    learningDetailClose.addEventListener(
      'click',
      closeLearningDetail
    );
  }


  if (learningDetailModal) {
    const backdrop =
      learningDetailModal.querySelector(
        '.learning-modal-backdrop, .modal-backdrop, .backdrop'
      );

    if (backdrop) {
      backdrop.addEventListener(
        'click',
        closeLearningDetail
      );
    }
  }


  if (learningRefreshBtn) {
    learningRefreshBtn.addEventListener(
      'click',
      loadLearning
    );
  }


  if (learningRetryBtn) {
    learningRetryBtn.addEventListener(
      'click',
      loadLearning
    );
  }


  if (learningSearch) {
    learningSearch.addEventListener(
      'input',
      renderCurrentLearningTab
    );
  }


  learningTabs.forEach(
    (tab) => {
      tab.addEventListener(
        'click',
        () => {
          learningTabs.forEach(
            (item) =>
              item.classList.remove(
                'active'
              )
          );

          tab.classList.add(
            'active'
          );

          currentLearningTab =
            tab.dataset.learningTab ||
            'knowledge';

          renderCurrentLearningTab();
        }
      );
    }
  );


  // ============================================================
  // SKILLS
  // ============================================================

  async function loadSkills() {
    showSkillsLoading();

    try {
      const data =
        await fetchJSON(
          '/api/skills'
        );

      skillsData =
        Array.isArray(
          data.skills
        )
          ? data.skills
          : [];

      renderSkills();

    } catch (error) {
      if (
        error.message ===
        'UNAUTHORIZED'
      ) {
        return;
      }

      setText(
        skillsErrorDetail,
        error.message ||
          'Lỗi không xác định'
      );

      safeClass(
        skillsError,
        'remove',
        'hidden'
      );

    } finally {
      safeClass(
        skillsLoading,
        'add',
        'hidden'
      );
    }
  }


  function showSkillsLoading() {
    safeClass(
      skillsLoading,
      'remove',
      'hidden'
    );

    safeClass(
      skillsError,
      'add',
      'hidden'
    );

    safeClass(
      skillsEmpty,
      'add',
      'hidden'
    );
  }


  function renderSkills() {
    const query =
      String(
        skillsSearch?.value ||
        ''
      )
        .trim()
        .toLowerCase();

    let list =
      skillsData.slice();

    if (
      currentSkillTab !==
      'all'
    ) {
      list =
        list.filter(
          (skill) =>
            skill.type ===
            currentSkillTab
        );
    }

    if (query) {
      list =
        list.filter(
          (skill) => {
            const searchable = [
              skill.id,
              skill.name,
              skill.ownerId,
              skill.description,
              skill.trigger,
              skill.instructions,
              ...(Array.isArray(
                skill.tools
              )
                ? skill.tools
                : []),
              ...(Array.isArray(
                skill.permissions
              )
                ? skill.permissions
                : [])
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
    }

    skillsList.innerHTML = '';

    if (!list.length) {
      safeClass(
        skillsEmpty,
        'remove',
        'hidden'
      );

      return;
    }

    safeClass(
      skillsEmpty,
      'add',
      'hidden'
    );


    list.forEach(
      (skill) => {
        const card =
          document.createElement(
            'article'
          );

        card.className =
          'learning-card skill-card';

        const builtin =
          skill.type ===
          'builtin';

        const icon =
          builtin
            ? '🔧'
            : '👤';

        const enabled =
          skill.enabled !==
          false;

        const status =
          enabled
            ? 'Enabled'
            : 'Disabled';

        const tools =
          Array.isArray(
            skill.tools
          )
            ? skill.tools
            : [];

        const permissions =
          Array.isArray(
            skill.permissions
          )
            ? skill.permissions
            : [];

        card.innerHTML = `
          <div class="learning-card-top">

            <div class="learning-card-title">

              <span class="skill-icon">
                ${icon}
              </span>

              <div class="grow">

                <div class="title">
                  ${escapeHtml(
                    skill.name ||
                    skill.id ||
                    'Unnamed Skill'
                  )}
                </div>

                <div class="muted small">
                  ${escapeHtml(
                    skill.id ||
                    ''
                  )}
                </div>

              </div>

              <span
                class="learning-badge ${
                  builtin
                    ? ''
                    : 'candidate'
                }"
              >
                ${
                  builtin
                    ? 'Built-in'
                    : 'User'
                }
              </span>

            </div>


            <div class="learning-card-meta">

              <span>
                👤 ${
                  skill.ownerId
                    ? escapeHtml(
                        skill.ownerId
                      )
                    : 'System'
                }
              </span>

              <span>
                ▶️ ${
                  Number(
                    skill.usageCount ||
                    0
                  )
                }
              </span>

              <span
                class="${
                  enabled
                    ? 'online'
                    : 'offline'
                }"
              >
                ● ${status}
              </span>

            </div>


            <p class="learning-card-description">
              ${escapeHtml(
                skill.description ||
                'Không có mô tả.'
              )}
            </p>


            <div class="chips">

              ${tools
                .slice(0, 6)
                .map(
                  (tool) =>
                    `<span class="chip">
                      🧰 ${escapeHtml(tool)}
                    </span>`
                )
                .join('')}

              ${permissions
                .slice(0, 4)
                .map(
                  (permission) =>
                    `<span class="chip">
                      🔐 ${escapeHtml(
                        permission
                      )}
                    </span>`
                )
                .join('')}

            </div>

          </div>
        `;

        card.addEventListener(
          'click',
          () =>
            openSkillDetail(
              skill
            )
        );

        skillsList.appendChild(
          card
        );
      }
    );
  }


  function openSkillDetail(
    skill
  ) {
    const oldModal =
      document.getElementById(
        'skill-detail-modal'
      );

    if (oldModal) {
      oldModal.remove();
    }

    const modal =
      document.createElement(
        'div'
      );

    modal.id =
      'skill-detail-modal';

    modal.className =
      'modal';

    const tools =
      Array.isArray(
        skill.tools
      )
        ? skill.tools
        : [];

    const permissions =
      Array.isArray(
        skill.permissions
      )
        ? skill.permissions
        : [];

    const builtin =
      skill.type ===
      'builtin';

    modal.innerHTML = `
      <div class="modal-backdrop"></div>

      <div class="modal-card skill-detail-card">

        <div class="modal-header">

          <div>

            <h2>
              ${
                builtin
                  ? '🔧'
                  : '👤'
              }

              ${escapeHtml(
                skill.name ||
                skill.id ||
                'Skill'
              )}
            </h2>

            <p class="muted">
              ${escapeHtml(
                skill.id ||
                ''
              )}
            </p>

          </div>

          <button
            class="modal-close"
            type="button"
            aria-label="Đóng"
          >
            ×
          </button>

        </div>


        <div class="skill-detail-body">

          <div class="learning-detail-grid">

            <div>
              <span>
                Type
              </span>

              <strong>
                ${
                  builtin
                    ? 'Built-in'
                    : 'User Created'
                }
              </strong>
            </div>


            <div>
              <span>
                Owner
              </span>

              <strong>
                ${
                  skill.ownerId
                    ? escapeHtml(
                        skill.ownerId
                      )
                    : 'System'
                }
              </strong>
            </div>


            <div>
              <span>
                Version
              </span>

              <strong>
                ${escapeHtml(
                  skill.version ||
                  '1.0.0'
                )}
              </strong>
            </div>


            <div>
              <span>
                Status
              </span>

              <strong>
                ${
                  skill.enabled !==
                  false
                    ? '🟢 Enabled'
                    : '🔴 Disabled'
                }
              </strong>
            </div>


            <div>
              <span>
                Usage
              </span>

              <strong>
                ${Number(
                  skill.usageCount ||
                  0
                )}
              </strong>
            </div>


            <div>
              <span>
                Trigger
              </span>

              <strong>
                ${escapeHtml(
                  skill.trigger ||
                  '—'
                )}
              </strong>
            </div>

          </div>


          <div class="learning-detail-section">

            <h3>
              Description
            </h3>

            <p>
              ${escapeHtml(
                skill.description ||
                'Không có mô tả.'
              )}
            </p>

          </div>


          <div class="learning-detail-section">

            <h3>
              Instructions
            </h3>

            <pre class="skill-instructions">${escapeHtml(
              skill.instructions ||
              'Không có instructions.'
            )}</pre>

          </div>


          <div class="learning-detail-section">

            <h3>
              Tools
            </h3>

            <div class="chips">

              ${
                tools.length
                  ? tools
                      .map(
                        (tool) =>
                          `<span class="chip">
                            🧰 ${escapeHtml(
                              tool
                            )}
                          </span>`
                      )
                      .join('')
                  : '<span class="muted">Không có tool.</span>'
              }

            </div>

          </div>


          <div class="learning-detail-section">

            <h3>
              Permissions
            </h3>

            <div class="chips">

              ${
                permissions.length
                  ? permissions
                      .map(
                        (permission) =>
                          `<span class="chip">
                            🔐 ${escapeHtml(
                              permission
                            )}
                          </span>`
                      )
                      .join('')
                  : '<span class="muted">Không có permission.</span>'
              }

            </div>

          </div>


          <div class="learning-detail-section">

            <h3>
              Timeline
            </h3>

            <p>
              Created:
              ${formatTime(
                skill.createdAt
              )}
            </p>

            <p>
              Updated:
              ${formatTime(
                skill.updatedAt
              )}
            </p>

            <p>
              Last Used:
              ${formatTime(
                skill.lastUsedAt
              )}
            </p>

          </div>

        </div>

      </div>
    `;


    document.body.appendChild(
      modal
    );


    const closeButton =
      modal.querySelector(
        '.modal-close'
      );

    const backdrop =
      modal.querySelector(
        '.modal-backdrop, .backdrop'
      );


    const close = () => {
      modal.remove();

      if (
        !document.querySelector(
          '.modal:not(.hidden)'
        )
      ) {
        document.body.classList.remove(
          'modal-open'
        );
      }
    };


    closeButton.addEventListener(
      'click',
      close
    );


    backdrop.addEventListener(
      'click',
      close
    );


    document.addEventListener(
      'keydown',
      function escapeHandler(event) {
        if (
          event.key ===
          'Escape'
        ) {
          close();

          document.removeEventListener(
            'keydown',
            escapeHandler
          );
        }
      }
    );


    openModal(modal);
  }


  if (skillsRefreshBtn) {
    skillsRefreshBtn.addEventListener(
      'click',
      loadSkills
    );
  }


  if (skillsRetryBtn) {
    skillsRetryBtn.addEventListener(
      'click',
      loadSkills
    );
  }


  if (skillsSearch) {
    skillsSearch.addEventListener(
      'input',
      renderSkills
    );
  }


  skillsTabs.forEach(
    (tab) => {
      tab.addEventListener(
        'click',
        () => {
          skillsTabs.forEach(
            (item) =>
              item.classList.remove(
                'active'
              )
          );

          tab.classList.add(
            'active'
          );

          currentSkillTab =
            tab.dataset.skillTab ||
            'all';

          renderSkills();
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
        () => {
          if (
            currentView ===
            'dashboard'
          ) {
            loadBrains();
          }
        },
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
  // KEYBOARD
  // ============================================================

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !==
        'Escape'
      ) {
        return;
      }

      closeDetailModal();
      closeLearningDetail();

      const skillModal =
        document.getElementById(
          'skill-detail-modal'
        );

      if (skillModal) {
        skillModal.remove();
      }
    }
  );


  // ============================================================
  // INIT
  // ============================================================

  init();

})();
