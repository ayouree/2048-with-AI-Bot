/**
 * 2048 App Controller
 * Mengatur interaksi pengguna (WASD/Arrow/Touch), Sound FX, DOM Renderer,
 * Auto Bot Loop dengan visualisasi live, serta Sistem Leaderboard & Profil Pemain.
 */

class SoundController {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMove() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playMerge(value = 4) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const baseFreq = 300 + Math.min(Math.log2(value) * 60, 600);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.3);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }
}

/**
 * LeaderboardManager
 * Mengelola penyimpanan lokal daftar skor, nama pemain, pengurutan, dan batas rekaman.
 */
class LeaderboardManager {
  constructor() {
    this.STORAGE_KEY = '2048_leaderboard';
    this.PLAYER_KEY = '2048_player_name';
    this.MAX_ENTRIES = 50;
  }

  getPlayerName() {
    return localStorage.getItem(this.PLAYER_KEY) || '';
  }

  setPlayerName(name) {
    const clean = (name || '').trim();
    if (clean) {
      localStorage.setItem(this.PLAYER_KEY, clean);
    }
    return clean;
  }

  getScores() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      const list = JSON.parse(data);
      if (Array.isArray(list)) return list;
      return [];
    } catch (e) {
      return [];
    }
  }

  addScore({ name, score, maxTile, mode }) {
    if (!score || score <= 0) return null;

    const list = this.getScores();
    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      name: (name || 'Pemain').trim().substring(0, 16),
      score: score,
      maxTile: maxTile || 2,
      mode: mode || 'Manual',
      date: new Date().toISOString()
    };

    list.push(newEntry);

    // Urutkan skor tertinggi; jika seri, gunakan tile tertinggi
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.maxTile || 0) - (a.maxTile || 0);
    });

    // Batasi maksimum rekaman
    const trimmed = list.slice(0, this.MAX_ENTRIES);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));

    // Cari peringkat entry yang baru ditambahkan
    const rankIndex = trimmed.findIndex(entry => entry.id === newEntry.id);
    return rankIndex !== -1 ? rankIndex + 1 : null;
  }

  clearScores() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  formatDate(isoString) {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = months[d.getMonth()];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month}, ${hours}:${mins}`;
    } catch (e) {
      return '';
    }
  }
}

/**
 * App - Controller Utama Game
 */
class App {
  constructor() {
    this.game = new Game2048(4);
    this.ai = new AI2048();
    this.sound = new SoundController();
    this.leaderboard = new LeaderboardManager();

    // Player State
    this.playerName = this.leaderboard.getPlayerName();
    this.isBotUsedInCurrentGame = false;

    // DOM Elements - Game Board
    this.tileContainer = document.getElementById('tile-container');
    this.currentScoreEl = document.getElementById('current-score');
    this.bestScoreEl = document.getElementById('best-score');
    this.scoreAdditionEl = document.getElementById('score-addition');
    this.gameMessageEl = document.getElementById('game-message');
    this.messageTitleEl = document.getElementById('message-title');
    this.messageSubtitleEl = document.getElementById('message-subtitle');

    // DOM Elements - Player Header & Badges
    this.playerNameDisplay = document.getElementById('player-name-display');
    this.playerBadge = document.getElementById('player-badge');
    this.btnEditPlayer = document.getElementById('btn-edit-player');

    // Controls Buttons
    this.btnRestart = document.getElementById('btn-restart');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnSound = document.getElementById('btn-sound');
    this.soundIcon = document.getElementById('sound-icon');
    this.btnTryAgain = document.getElementById('btn-try-again');
    this.btnKeepGoing = document.getElementById('btn-keep-going');

    // Game Over Summary Elements
    this.summaryPlayer = document.getElementById('summary-player');
    this.summaryScore = document.getElementById('summary-score');
    this.summaryTile = document.getElementById('summary-tile');
    this.rankNotification = document.getElementById('rank-notification');
    this.btnModalLeaderboard = document.getElementById('btn-modal-leaderboard');

    // Bot Controls & Stats
    this.btnToggleBot = document.getElementById('btn-toggle-bot');
    this.btnStepBot = document.getElementById('btn-step-bot');
    this.botBtnIcon = document.getElementById('bot-btn-icon');
    this.botBtnText = document.getElementById('bot-btn-text');
    this.botStatusDot = document.getElementById('bot-status-dot');
    this.botStatusText = document.getElementById('bot-status-text');
    this.speedSlider = document.getElementById('bot-speed');
    this.speedDisplay = document.getElementById('speed-display');
    this.aiModeSelect = document.getElementById('ai-mode');

    this.statMovesEl = document.getElementById('stat-moves');
    this.statMaxTileEl = document.getElementById('stat-max-tile');
    this.statNextMoveEl = document.getElementById('stat-next-move');
    this.statEvalTimeEl = document.getElementById('stat-eval-time');

    // Side Panel Tabs
    this.tabBtnBot = document.getElementById('tab-btn-bot');
    this.tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');
    this.tabBotContent = document.getElementById('tab-bot-content');
    this.tabLeaderboardContent = document.getElementById('tab-leaderboard-content');

    // Leaderboard Lists & Modals
    this.sideLeaderboardList = document.getElementById('side-leaderboard-list');
    this.modalLeaderboardList = document.getElementById('modal-leaderboard-list');
    this.btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    this.btnViewAllLeaderboard = document.getElementById('btn-view-all-leaderboard');
    this.btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
    this.btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');
    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    this.btnCloseLeaderboardFooter = document.getElementById('btn-close-leaderboard-footer');

    // Player Name Modal
    this.playerModal = document.getElementById('player-modal');
    this.playerNameForm = document.getElementById('player-name-form');
    this.playerNameInput = document.getElementById('player-name-input');
    this.btnCancelPlayerModal = document.getElementById('btn-cancel-player-modal');
    this.playerModalTitle = document.getElementById('player-modal-title');
    this.playerModalDesc = document.getElementById('player-modal-desc');

    // Bot Runtime State
    this.isBotRunning = false;
    this.botTimer = null;
    this.botMoveCount = 0;
    this.botSpeedMs = parseInt(this.speedSlider.value, 10);

    this.initEvents();
    this.render();
    this.updateScores(0);
    this.renderLeaderboard();

    // Cek apakah pemain sudah memasukkan nama sebelumnya
    if (!this.playerName) {
      this.showPlayerModal(true);
    } else {
      this.updatePlayerDisplay();
    }
  }

  updatePlayerDisplay() {
    this.playerNameDisplay.textContent = this.playerName || 'Pemain';
  }

  showPlayerModal(isMandatory = false) {
    if (this.isBotRunning) this.stopBot();

    if (isMandatory) {
      this.playerModalTitle.textContent = 'Selamat Datang di 2048!';
      this.playerModalDesc.textContent = 'Silakan masukkan nama Anda sebelum mulai bermain untuk dicatat di Leaderboard.';
      this.btnCancelPlayerModal.style.display = 'none';
    } else {
      this.playerModalTitle.textContent = 'Ganti Nama Pemain';
      this.playerModalDesc.textContent = 'Ubah nama untuk skor dan pencatatan leaderboard selanjutnya.';
      this.btnCancelPlayerModal.style.display = 'inline-block';
    }

    this.playerNameInput.value = this.playerName || '';
    this.playerModal.classList.add('active');
    setTimeout(() => this.playerNameInput.focus(), 150);
  }

  hidePlayerModal() {
    this.playerModal.classList.remove('active');
  }

  openLeaderboardModal() {
    this.renderLeaderboard();
    this.leaderboardModal.classList.add('active');
  }

  closeLeaderboardModal() {
    this.leaderboardModal.classList.remove('active');
  }

  switchTab(tabName) {
    if (tabName === 'bot') {
      this.tabBtnBot.classList.add('active');
      this.tabBtnLeaderboard.classList.remove('active');
      this.tabBotContent.classList.add('active');
      this.tabLeaderboardContent.classList.remove('active');
    } else {
      this.tabBtnLeaderboard.classList.add('active');
      this.tabBtnBot.classList.remove('active');
      this.tabLeaderboardContent.classList.add('active');
      this.tabBotContent.classList.remove('active');
      this.renderLeaderboard();
    }
  }

  initEvents() {
    // 1. Keyboard Controls: WASD & Arrow Keys
    window.addEventListener('keydown', (e) => {
      // Abaikan jika sedang mengetik di input/select atau modal aktif
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (this.playerModal.classList.contains('active') || this.leaderboardModal.classList.contains('active')) return;

      const key = e.key;
      let direction = null;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        direction = Game2048.UP;
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        direction = Game2048.RIGHT;
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        direction = Game2048.DOWN;
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        direction = Game2048.LEFT;
      }

      if (direction !== null) {
        e.preventDefault();
        // Jika bot sedang jalan dan pengguna menekan tombol, pause bot
        if (this.isBotRunning) {
          this.stopBot();
        }
        this.performMove(direction);
      }
    });

    // 2. Touch / Mobile Swipe Gesture
    let touchStartX = 0;
    let touchStartY = 0;
    const gridContainer = document.getElementById('grid-container');

    gridContainer.addEventListener('touchstart', (e) => {
      if (this.playerModal.classList.contains('active') || this.leaderboardModal.classList.contains('active')) return;
      if (e.touches.length > 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });

    gridContainer.addEventListener('touchend', (e) => {
      if (this.playerModal.classList.contains('active') || this.leaderboardModal.classList.contains('active')) return;
      if (e.changedTouches.length === 0) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimal jarak swipe 30px
      if (Math.max(absDx, absDy) > 30) {
        let direction = null;
        if (absDx > absDy) {
          direction = dx > 0 ? Game2048.RIGHT : Game2048.LEFT;
        } else {
          direction = dy > 0 ? Game2048.DOWN : Game2048.UP;
        }

        if (direction !== null) {
          if (this.isBotRunning) this.stopBot();
          this.performMove(direction);
        }
      }
      e.preventDefault();
    }, { passive: false });

    // 3. Mobile D-pad buttons
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.playerModal.classList.contains('active') || this.leaderboardModal.classList.contains('active')) return;
        const dir = parseInt(btn.getAttribute('data-dir'), 10);
        if (this.isBotRunning) this.stopBot();
        this.performMove(dir);
      });
    });

    // 4. Buttons Game
    this.btnRestart.addEventListener('click', () => this.restartGame());
    this.btnTryAgain.addEventListener('click', () => this.restartGame());
    this.btnKeepGoing.addEventListener('click', () => {
      this.game.keepPlaying = true;
      this.gameMessageEl.classList.remove('active');
      if (this.isBotRunning) this.scheduleNextBotMove();
    });

    this.btnUndo.addEventListener('click', () => {
      if (this.isBotRunning) this.stopBot();
      if (this.game.undo()) {
        this.render();
        this.updateScores(0);
        this.gameMessageEl.classList.remove('active');
      }
    });

    this.btnSound.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      this.soundIcon.textContent = this.sound.enabled ? '🔊' : '🔇';
    });

    // 5. Bot Controls
    this.btnToggleBot.addEventListener('click', () => {
      if (this.isBotRunning) {
        this.stopBot();
      } else {
        this.startBot();
      }
    });

    this.btnStepBot.addEventListener('click', () => {
      if (this.isBotRunning) this.stopBot();
      this.isBotUsedInCurrentGame = true;
      this.stepBot();
    });

    this.speedSlider.addEventListener('input', (e) => {
      this.botSpeedMs = parseInt(e.target.value, 10);
      this.updateSpeedDisplay();
    });

    // 6. Side Panel Tabs
    this.tabBtnBot.addEventListener('click', () => this.switchTab('bot'));
    this.tabBtnLeaderboard.addEventListener('click', () => this.switchTab('leaderboard'));

    // 7. Leaderboard Modals & Buttons
    this.btnOpenLeaderboard.addEventListener('click', () => this.openLeaderboardModal());
    this.btnViewAllLeaderboard.addEventListener('click', () => this.openLeaderboardModal());
    this.btnModalLeaderboard.addEventListener('click', () => {
      this.openLeaderboardModal();
    });

    this.btnCloseLeaderboard.addEventListener('click', () => this.closeLeaderboardModal());
    this.btnCloseLeaderboardFooter.addEventListener('click', () => this.closeLeaderboardModal());
    this.btnRefreshLeaderboard.addEventListener('click', () => this.renderLeaderboard());

    this.btnClearLeaderboard.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin mereset dan menghapus seluruh rekor di Leaderboard?')) {
        this.leaderboard.clearScores();
        this.renderLeaderboard();
      }
    });

    // Klik di luar dialog modal untuk menutup modal leaderboard
    this.leaderboardModal.addEventListener('click', (e) => {
      if (e.target === this.leaderboardModal) {
        this.closeLeaderboardModal();
      }
    });

    // 8. Player Profile & Name Edit
    const triggerPlayerModal = () => this.showPlayerModal(false);
    this.playerBadge.addEventListener('click', triggerPlayerModal);
    this.btnEditPlayer.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerPlayerModal();
    });

    this.btnCancelPlayerModal.addEventListener('click', () => {
      if (this.playerName) {
        this.hidePlayerModal();
      }
    });

    this.playerNameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.playerNameInput.value.trim();
      if (val.length < 2) {
        alert('Nama pemain minimal terdiri dari 2 karakter.');
        return;
      }
      this.playerName = this.leaderboard.setPlayerName(val);
      this.updatePlayerDisplay();
      this.hidePlayerModal();
      this.renderLeaderboard();
    });

    // 9. Listeners Game Engine
    this.game.on('onScore', ({ scoreGained, totalScore }) => {
      this.sound.playMerge();
      this.showScoreAddition(scoreGained);
      this.updateScores(totalScore);
    });

    this.game.on('onGameOver', () => {
      this.sound.playGameOver();
      let rank = null;

      // Catat skor akhir ke leaderboard jika skor > 0
      if (this.game.score > 0) {
        const mode = this.isBotUsedInCurrentGame ? 'AI Bot' : 'Manual';
        rank = this.leaderboard.addScore({
          name: this.playerName || 'Pemain',
          score: this.game.score,
          maxTile: this.game.getMaxTile(),
          mode: mode
        });
        this.renderLeaderboard();
      }

      this.showGameOverModal(rank);

      if (this.isBotRunning) {
        this.stopBot();
        this.botStatusText.textContent = 'Game Over';
      }
    });

    this.game.on('onGameWon', () => {
      if (!this.game.keepPlaying) {
        if (this.isBotRunning) {
          // Jika bot yang main, otomatis lanjutkan agar bisa tembus skor maksimal
          this.game.keepPlaying = true;
        } else {
          this.showGameWonModal();
        }
      }
    });
  }

  updateSpeedDisplay() {
    let speedText = '';
    if (this.botSpeedMs <= 30) speedText = `Kilat (${this.botSpeedMs}ms)`;
    else if (this.botSpeedMs <= 100) speedText = `Cepat (${this.botSpeedMs}ms)`;
    else if (this.botSpeedMs <= 250) speedText = `Sedang (${this.botSpeedMs}ms)`;
    else speedText = `Santai (${this.botSpeedMs}ms)`;
    this.speedDisplay.textContent = speedText;
  }

  restartGame() {
    if (this.isBotRunning) this.stopBot();
    this.game.init();
    this.isBotUsedInCurrentGame = false;
    this.botMoveCount = 0;
    this.statMovesEl.textContent = '0';
    this.statNextMoveEl.textContent = '-';
    this.statEvalTimeEl.textContent = '0 ms';
    this.gameMessageEl.classList.remove('active');
    this.render();
    this.updateScores(0);
  }

  performMove(direction) {
    const moved = this.game.move(direction);
    if (moved) {
      this.sound.playMove();
      this.render();
      this.updateScores(this.game.score);
    }
    return moved;
  }

  render() {
    this.tileContainer.innerHTML = '';
    const tileSize = this.getTileSize();
    const tileGap = this.getTileGap();

    let maxTile = 2;

    for (let r = 0; r < this.game.size; r++) {
      for (let c = 0; c < this.game.size; c++) {
        const tile = this.game.grid[r][c];
        if (tile) {
          if (tile.value > maxTile) maxTile = tile.value;

          const tileEl = document.createElement('div');
          const valueClass = tile.value > 8192 ? 'tile-super' : `tile-${tile.value}`;
          tileEl.className = `tile ${valueClass}`;

          if (tile.isNew) tileEl.classList.add('tile-new');
          if (tile.merged) tileEl.classList.add('tile-merged');

          // Kalkulasi koordinat posisi
          const x = c * (tileSize + tileGap);
          const y = r * (tileSize + tileGap);
          tileEl.style.transform = `translate(${x}px, ${y}px)`;

          const innerEl = document.createElement('div');
          innerEl.className = 'tile-inner';
          innerEl.textContent = tile.value;

          tileEl.appendChild(innerEl);
          this.tileContainer.appendChild(tileEl);
        }
      }
    }

    this.statMaxTileEl.textContent = maxTile;
  }

  getTileSize() {
    const rootStyle = getComputedStyle(document.documentElement);
    return parseInt(rootStyle.getPropertyValue('--tile-size')) || 106;
  }

  getTileGap() {
    const rootStyle = getComputedStyle(document.documentElement);
    return parseInt(rootStyle.getPropertyValue('--tile-gap')) || 15;
  }

  updateScores(score) {
    this.currentScoreEl.textContent = score || this.game.score;
    this.bestScoreEl.textContent = this.game.bestScore;
  }

  showScoreAddition(amount) {
    if (!amount) return;
    this.scoreAdditionEl.textContent = `+${amount}`;
    this.scoreAdditionEl.classList.remove('active');
    void this.scoreAdditionEl.offsetWidth; // Force Reflow
    this.scoreAdditionEl.classList.add('active');
  }

  showGameOverModal(rank = null) {
    this.messageTitleEl.textContent = 'Game Over!';
    this.messageSubtitleEl.textContent = 'Tidak ada langkah tersisa.';

    this.summaryPlayer.textContent = this.playerName || 'Pemain';
    this.summaryScore.textContent = (this.game.score || 0).toLocaleString('id-ID');
    this.summaryTile.textContent = this.game.getMaxTile() || 2;

    if (rank) {
      this.rankNotification.textContent = `🎉 Masuk Peringkat #${rank} di Leaderboard!`;
    } else {
      this.rankNotification.textContent = '';
    }

    this.btnKeepGoing.style.display = 'none';
    this.gameMessageEl.classList.add('active');
  }

  showGameWonModal() {
    this.messageTitleEl.textContent = 'Selamat! Anda Menang!';
    this.messageSubtitleEl.textContent = 'Tile 2048 berhasil dicapai!';
    this.summaryPlayer.textContent = this.playerName || 'Pemain';
    this.summaryScore.textContent = (this.game.score || 0).toLocaleString('id-ID');
    this.summaryTile.textContent = this.game.getMaxTile() || 2048;
    this.rankNotification.textContent = '🎉 Luar biasa! Raih rekor setinggi mungkin!';
    this.btnKeepGoing.style.display = 'inline-block';
    this.gameMessageEl.classList.add('active');
  }

  // ==========================================
  // Leaderboard Renderer
  // ==========================================
  renderLeaderboard() {
    const scores = this.leaderboard.getScores();

    const generateHTML = (list, isCompact = false) => {
      if (!list || list.length === 0) {
        return `
          <div class="leaderboard-empty">
            <span class="empty-icon">🏆</span>
            <p>Belum Ada Rekor</p>
            <span>Jadilah yang pertama mencatat skor tertinggi!</span>
          </div>
        `;
      }

      return list.map((entry, idx) => {
        const rank = idx + 1;
        let rankBadgeClass = '';
        let rankText = `#${rank}`;

        if (rank === 1) {
          rankBadgeClass = 'rank-1';
          rankText = '🥇';
        } else if (rank === 2) {
          rankBadgeClass = 'rank-2';
          rankText = '🥈';
        } else if (rank === 3) {
          rankBadgeClass = 'rank-3';
          rankText = '🥉';
        }

        const isMe = this.playerName && entry.name.toLowerCase() === this.playerName.toLowerCase();
        const meClass = isMe ? 'is-current-user' : '';
        const youBadge = isMe ? '<span class="lb-you-tag">Kamu</span>' : '';

        const tileClass = entry.maxTile > 8192 ? 'tile-super' : `tile-${entry.maxTile}`;
        const modeClass = entry.mode === 'AI Bot' ? 'lb-mode-bot' : 'lb-mode-manual';
        const modeText = entry.mode === 'AI Bot' ? '🤖 Bot' : '🎮 Manual';
        const formattedDate = this.leaderboard.formatDate(entry.date);

        return `
          <div class="lb-card ${meClass}">
            <div class="lb-left">
              <span class="lb-rank ${rankBadgeClass}">${rankText}</span>
              <div class="lb-details">
                <div class="lb-player-row">
                  <span class="lb-player-name" title="${entry.name}">${this.escapeHtml(entry.name)}</span>
                  ${youBadge}
                </div>
                <div class="lb-meta">
                  <span class="lb-mode-tag ${modeClass}">${modeText}</span>
                  ${formattedDate ? `<span>• ${formattedDate}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="lb-right">
              <span class="lb-tile-badge ${tileClass}" title="Tile Terbesar: ${entry.maxTile}">${entry.maxTile}</span>
              <span class="lb-score-val">${entry.score.toLocaleString('id-ID')}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    // Render Side Panel (Top 10)
    if (this.sideLeaderboardList) {
      this.sideLeaderboardList.innerHTML = generateHTML(scores.slice(0, 10), true);
    }

    // Render Full Modal (Top 50)
    if (this.modalLeaderboardList) {
      this.modalLeaderboardList.innerHTML = generateHTML(scores, false);
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================
  // Auto Bot Management
  // ==========================================

  startBot() {
    if (this.game.over) {
      this.restartGame();
    }

    this.isBotUsedInCurrentGame = true;
    this.isBotRunning = true;
    this.btnToggleBot.classList.add('running');
    this.botBtnIcon.textContent = '⏸';
    this.botBtnText.textContent = 'Jeda Auto Bot';
    this.botStatusDot.classList.add('running');
    this.botStatusText.textContent = 'Bot Berjalan';

    this.scheduleNextBotMove();
  }

  stopBot() {
    this.isBotRunning = false;
    clearTimeout(this.botTimer);
    this.botTimer = null;
    this.btnToggleBot.classList.remove('running');
    this.botBtnIcon.textContent = '▶';
    this.botBtnText.textContent = 'Jalankan Auto Bot';
    this.botStatusDot.classList.remove('running');
    this.botStatusText.textContent = 'Bot Dijeda';
  }

  stepBot() {
    if (this.game.over) return;

    this.isBotUsedInCurrentGame = true;
    const rawBoard = this.game.getRawBoard();
    const mode = this.aiModeSelect.value;
    const aiResult = this.ai.getBestMove(rawBoard, mode);

    if (aiResult.move !== null) {
      const dirInfo = AI2048.getDirectionLabel(aiResult.move);
      this.statNextMoveEl.textContent = `${dirInfo.arrow} ${dirInfo.key}`;
      this.statEvalTimeEl.textContent = `${aiResult.duration} ms`;

      const moved = this.performMove(aiResult.move);
      if (moved) {
        this.botMoveCount++;
        this.statMovesEl.textContent = this.botMoveCount;
      }
      return moved;
    } else {
      this.stopBot();
      return false;
    }
  }

  scheduleNextBotMove() {
    if (!this.isBotRunning || this.game.over) return;

    const step = () => {
      if (!this.isBotRunning || this.game.over) return;

      const moved = this.stepBot();
      if (moved && !this.game.over && this.isBotRunning) {
        this.botTimer = setTimeout(step, this.botSpeedMs);
      } else if (!moved) {
        this.stopBot();
      }
    };

    this.botTimer = setTimeout(step, this.botSpeedMs);
  }
}

// Inisialisasi saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new App();
});

// Update ukuran tile dinamis saat resize window
window.addEventListener('resize', () => {
  if (window.gameApp) {
    window.gameApp.render();
  }
});
