/**
 * 2048 App Controller
 * Mengatur interaksi pengguna (WASD/Arrow/Touch), Sound FX, DOM Renderer,
 * serta Auto Bot Loop dengan visualisasi live.
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

class App {
  constructor() {
    this.game = new Game2048(4);
    this.ai = new AI2048();
    this.sound = new SoundController();

    // DOM Elements
    this.tileContainer = document.getElementById('tile-container');
    this.currentScoreEl = document.getElementById('current-score');
    this.bestScoreEl = document.getElementById('best-score');
    this.scoreAdditionEl = document.getElementById('score-addition');
    this.gameMessageEl = document.getElementById('game-message');
    this.messageTitleEl = document.getElementById('message-title');
    this.messageSubtitleEl = document.getElementById('message-subtitle');

    // Controls Buttons
    this.btnRestart = document.getElementById('btn-restart');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnSound = document.getElementById('btn-sound');
    this.soundIcon = document.getElementById('sound-icon');
    this.btnTryAgain = document.getElementById('btn-try-again');
    this.btnKeepGoing = document.getElementById('btn-keep-going');

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

    // Bot State
    this.isBotRunning = false;
    this.botTimer = null;
    this.botMoveCount = 0;
    this.botSpeedMs = parseInt(this.speedSlider.value, 10);

    this.initEvents();
    this.render();
    this.updateScores(0);
  }

  initEvents() {
    // 1. Keyboard Controls: WASD & Arrow Keys
    window.addEventListener('keydown', (e) => {
      // Abaikan jika sedang mengetik di input/select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

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
      if (e.touches.length > 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });

    gridContainer.addEventListener('touchend', (e) => {
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
        const dir = parseInt(btn.getAttribute('data-dir'), 10);
        if (this.isBotRunning) this.stopBot();
        this.performMove(dir);
      });
    });

    // 4. Buttons
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
      this.stepBot();
    });

    this.speedSlider.addEventListener('input', (e) => {
      this.botSpeedMs = parseInt(e.target.value, 10);
      this.updateSpeedDisplay();
    });

    // Listeners Game Engine
    this.game.on('onScore', ({ scoreGained, totalScore }) => {
      this.sound.playMerge();
      this.showScoreAddition(scoreGained);
      this.updateScores(totalScore);
    });

    this.game.on('onGameOver', () => {
      this.sound.playGameOver();
      this.showGameOverModal();
      if (this.isBotRunning) {
        this.stopBot();
        this.botStatusText.textContent = 'Game Over';
      }
    });

    this.game.on('onGameWon', () => {
      if (!this.game.keepPlaying) {
        if (this.isBotRunning) {
          // Jika bot yang main, otomatis lanjutkan agar bisa tembus 4096 / skor tertinggi
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

  showGameOverModal() {
    this.messageTitleEl.textContent = 'Game Over!';
    this.messageSubtitleEl.textContent = `Skor akhir Anda: ${this.game.score}`;
    this.btnKeepGoing.style.display = 'none';
    this.gameMessageEl.classList.add('active');
  }

  showGameWonModal() {
    this.messageTitleEl.textContent = 'Selamat! Anda Menang!';
    this.messageSubtitleEl.textContent = 'Tile 2048 berhasil dicapai!';
    this.btnKeepGoing.style.display = 'inline-block';
    this.gameMessageEl.classList.add('active');
  }

  // ==========================================
  // Auto Bot Management
  // ==========================================

  startBot() {
    if (this.game.over) {
      this.restartGame();
    }

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
