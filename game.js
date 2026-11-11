/**
 * 2048 Game Engine
 * Mengelola state board, pergerakan tile, scoring, dan rendering visual.
 */

class Game2048 {
  constructor(size = 4) {
    this.size = size;
    this.grid = [];
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
    this.won = false;
    this.over = false;
    this.keepPlaying = false;
    this.history = []; // Untuk fitur Undo
    this.tileIdCounter = 1;

    this.listeners = {
      onMove: [],
      onScore: [],
      onGameOver: [],
      onGameWon: []
    };

    this.init();
  }

  // Arah konvensi: 0: Up, 1: Right, 2: Down, 3: Left
  static get UP() { return 0; }
  static get RIGHT() { return 1; }
  static get DOWN() { return 2; }
  static get LEFT() { return 3; }

  init() {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.won = false;
    this.over = false;
    this.keepPlaying = false;
    this.history = [];
    this.tileIdCounter = 1;

    this.addRandomTile();
    this.addRandomTile();
  }

  createEmptyGrid() {
    const grid = [];
    for (let r = 0; r < this.size; r++) {
      grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        grid[r][c] = null;
      }
    }
    return grid;
  }

  saveState() {
    // Simpan snapshot untuk Undo (maksimal 10 langkah)
    const gridSnapshot = this.grid.map(row => 
      row.map(cell => cell ? { ...cell } : null)
    );
    this.history.push({
      grid: gridSnapshot,
      score: this.score,
      won: this.won,
      over: this.over
    });
    if (this.history.length > 10) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) return false;
    const previous = this.history.pop();
    this.grid = previous.grid;
    this.score = previous.score;
    this.won = previous.won;
    this.over = previous.over;
    return true;
  }

  getEmptyCells(grid = this.grid) {
    const cells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (!grid[r][c]) {
          cells.push({ r, c });
        }
      }
    }
    return cells;
  }

  addRandomTile() {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return null;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = {
      id: this.tileIdCounter++,
      value: value,
      r: randomCell.r,
      c: randomCell.c,
      isNew: true,
      mergedInto: null
    };

    this.grid[randomCell.r][randomCell.c] = tile;
    return tile;
  }

  // Vectors pergeseran
  getVector(direction) {
    const map = {
      0: { r: -1, c: 0 }, // Up
      1: { r: 0, c: 1 },  // Right
      2: { r: 1, c: 0 },  // Down
      3: { r: 0, c: -1 }  // Left
    };
    return map[direction];
  }

  // Traversal order untuk menggeser dari arah yang tepat
  buildTraversals(vector) {
    const traversals = { r: [], c: [] };
    for (let pos = 0; pos < this.size; pos++) {
      traversals.r.push(pos);
      traversals.c.push(pos);
    }

    if (vector.r === 1) traversals.r.reverse(); // Bawah ke atas jika geser ke bawah
    if (vector.c === 1) traversals.c.reverse(); // Kanan ke kiri jika geser ke kanan

    return traversals;
  }

  withinBounds(pos) {
    return pos.r >= 0 && pos.r < this.size && pos.c >= 0 && pos.c < this.size;
  }

  findFarthestPosition(cell, vector) {
    let previous;
    let current = { r: cell.r, c: cell.c };

    do {
      previous = current;
      current = { r: previous.r + vector.r, c: previous.c + vector.c };
    } while (this.withinBounds(current) && !this.grid[current.r][current.c]);

    return {
      farthest: previous,
      next: current // Bisa jadi cell terisi atau di luar batas
    };
  }

  // Melakukan move aktual dalam game
  move(direction) {
    if (this.over) return false;

    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;
    let scoreGained = 0;

    // Bersihkan status flag animasi sebelumnya
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const tile = this.grid[r][c];
        if (tile) {
          tile.isNew = false;
          tile.merged = false;
        }
      }
    }

    // Buat snapshot sebelum modifikasi jika ada gerakan
    const preMoveSnapshot = this.grid.map(row => 
      row.map(cell => cell ? { ...cell } : null)
    );
    const preMoveScore = this.score;

    traversals.r.forEach(r => {
      traversals.c.forEach(c => {
        const cell = { r, c };
        const tile = this.grid[r][c];

        if (tile) {
          const positions = this.findFarthestPosition(cell, vector);
          const nextCell = positions.next;
          const nextTile = this.withinBounds(nextCell) ? this.grid[nextCell.r][nextCell.c] : null;

          // Cek apakah bisa digabungkan (merge)
          if (nextTile && nextTile.value === tile.value && !nextTile.merged) {
            const mergedTile = {
              id: this.tileIdCounter++,
              value: tile.value * 2,
              r: nextCell.r,
              c: nextCell.c,
              merged: true,
              isNew: false
            };

            this.grid[nextCell.r][nextCell.c] = mergedTile;
            this.grid[cell.r][cell.c] = null;

            scoreGained += mergedTile.value;

            if (mergedTile.value === 2048 && !this.won && !this.keepPlaying) {
              this.won = true;
            }

            moved = true;
          } else {
            // Pindahkan ke titik terjauh yang kosong
            const farthest = positions.farthest;
            if (cell.r !== farthest.r || cell.c !== farthest.c) {
              this.grid[farthest.r][farthest.c] = tile;
              this.grid[cell.r][cell.c] = null;
              tile.r = farthest.r;
              tile.c = farthest.c;
              moved = true;
            }
          }
        }
      });
    });

    if (moved) {
      // Simpan history untuk Undo
      this.history.push({
        grid: preMoveSnapshot,
        score: preMoveScore,
        won: this.won,
        over: this.over
      });
      if (this.history.length > 10) this.history.shift();

      this.score += scoreGained;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('2048_best_score', this.bestScore.toString());
      }

      this.addRandomTile();

      if (!this.movesAvailable()) {
        this.over = true;
      }

      this.emit('onMove', { direction, moved, scoreGained, score: this.score });
      if (scoreGained > 0) this.emit('onScore', { scoreGained, totalScore: this.score });
      if (this.won && !this.keepPlaying) this.emit('onGameWon');
      if (this.over) this.emit('onGameOver');

      return true;
    }

    return false;
  }

  movesAvailable() {
    return this.getEmptyCells().length > 0 || this.tileMatchesAvailable();
  }

  tileMatchesAvailable() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const tile = this.grid[r][c];
        if (tile) {
          for (let direction = 0; direction < 4; direction++) {
            const vector = this.getVector(direction);
            const otherPos = { r: r + vector.r, c: c + vector.c };
            if (this.withinBounds(otherPos)) {
              const other = this.grid[otherPos.r][otherPos.c];
              if (other && other.value === tile.value) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  getMaxTile() {
    let max = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] && this.grid[r][c].value > max) {
          max = this.grid[r][c].value;
        }
      }
    }
    return max;
  }

  // Event listener system
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // Export board matrix berupa array angka murni (misal untuk AI solver)
  getRawBoard() {
    const raw = [];
    for (let r = 0; r < this.size; r++) {
      raw[r] = [];
      for (let c = 0; c < this.size; c++) {
        raw[r][c] = this.grid[r][c] ? this.grid[r][c].value : 0;
      }
    }
    return raw;
  }
}
