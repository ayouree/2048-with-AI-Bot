/**
 * 2048 AI Solver Engine
 * Menggunakan Algoritma Expectimax Search dan Heuristik Berbobot Tinggi
 * (Monotonicity, Smoothness, Free Cells, dan Corner Locking).
 */

class AI2048 {
  constructor() {
    // Bobot heuristik yang dioptimalkan untuk mencapai skor tinggi (2048, 4096, 8192+)
    this.weights = {
      empty: 270.0,
      monotonicity: 45.0,
      smoothness: 0.15,
      maxTileInCorner: 800.0
    };
  }

  // Helper konversi arah ke nama teks & panah
  // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
  static getDirectionLabel(dir) {
    const labels = [
      { text: 'ATAS (W / ↑)', arrow: '▲', key: 'UP' },
      { text: 'KANAN (D / →)', arrow: '▶', key: 'RIGHT' },
      { text: 'BAWAH (S / ↓)', arrow: '▼', key: 'DOWN' },
      { text: 'KIRI (A / ←)', arrow: '◀', key: 'LEFT' }
    ];
    return labels[dir] || { text: 'None', arrow: '-', key: 'NONE' };
  }

  /**
   * Mengambil langkah terbaik berdasarkan mode AI yang dipilih
   */
  getBestMove(rawBoard, mode = 'expectimax') {
    const startTime = performance.now();
    let bestMove = null;
    let evalScore = 0;

    switch (mode) {
      case 'expectimax': {
        const emptyCount = this.countEmptyCells(rawBoard);
        // Atur depth adaptif untuk menjaga FPS dan ketajaman analisa
        let depth = 3;
        if (emptyCount <= 2) depth = 4;
        else if (emptyCount > 8) depth = 2;

        const result = this.expectimax(rawBoard, depth, true);
        bestMove = result.move;
        evalScore = result.score;
        break;
      }

      case 'corner': {
        bestMove = this.cornerHeuristicMove(rawBoard);
        evalScore = 100;
        break;
      }

      case 'random': {
        const validMoves = this.getValidMoves(rawBoard);
        if (validMoves.length > 0) {
          bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        break;
      }
    }

    // Jika AI tidak menemukan langkah valid, fallback ke langkah legal pertama
    if (bestMove === null) {
      const valid = this.getValidMoves(rawBoard);
      bestMove = valid.length > 0 ? valid[0] : null;
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      move: bestMove,
      evalScore,
      duration
    };
  }

  /**
   * Expectimax Recursive Tree Search
   * isMaxNode = true: Giliran Player memilih salah satu dari 4 arah
   * isMaxNode = false: Giliran Chance (spawning angka 2 [90%] atau 4 [10%] di sel kosong)
   */
  expectimax(board, depth, isMaxNode) {
    if (depth === 0) {
      return { score: this.evaluateBoard(board), move: null };
    }

    if (isMaxNode) {
      let maxScore = -Infinity;
      let bestMove = null;
      let hasValidMove = false;

      // Iterasi 4 arah: 0: Up, 1: Right, 2: Down, 3: Left
      // Urutan prioritas: Down, Left, Right, Up
      const directions = [2, 3, 1, 0];

      for (const dir of directions) {
        const sim = this.simulateMove(board, dir);
        if (sim.moved) {
          hasValidMove = true;
          const res = this.expectimax(sim.board, depth - 1, false);
          if (res.score > maxScore) {
            maxScore = res.score;
            bestMove = dir;
          }
        }
      }

      if (!hasValidMove) {
        return { score: -100000, move: null };
      }

      return { score: maxScore, move: bestMove };
    } else {
      // Chance Node (Tile Spawning)
      const emptyCells = this.getEmptyCellCoordinates(board);
      if (emptyCells.length === 0) {
        return { score: this.evaluateBoard(board), move: null };
      }

      let expectedScore = 0;
      // Batasi sampling jika sel kosong banyak agar responsif
      const sampleCells = emptyCells.length > 4 ? emptyCells.slice(0, 4) : emptyCells;
      const probWeight = 1.0 / sampleCells.length;

      for (const cell of sampleCells) {
        // Peluang 90% spawn nilai 2
        board[cell.r][cell.c] = 2;
        const res2 = this.expectimax(board, depth - 1, true);
        board[cell.r][cell.c] = 0;

        // Peluang 10% spawn nilai 4
        board[cell.r][cell.c] = 4;
        const res4 = this.expectimax(board, depth - 1, true);
        board[cell.r][cell.c] = 0;

        expectedScore += probWeight * (0.9 * res2.score + 0.1 * res4.score);
      }

      return { score: expectedScore, move: null };
    }
  }

  /**
   * Strategi Corner: Prioritaskan Bawah dan Kiri
   */
  cornerHeuristicMove(board) {
    // Urutan prioritas: Down (2), Left (3), Right (1), Up (0)
    const priority = [2, 3, 1, 0];
    for (const dir of priority) {
      const sim = this.simulateMove(board, dir);
      if (sim.moved) {
        return dir;
      }
    }
    return null;
  }

  /**
   * Fungsi Evaluasi Heuristik State Papan
   */
  evaluateBoard(board) {
    const emptyCells = this.countEmptyCells(board);
    if (emptyCells === 0 && !this.hasPossibleMerges(board)) {
      return -999999;
    }

    const smoothness = this.calculateSmoothness(board);
    const monotonicity = this.calculateMonotonicity(board);
    const emptyScore = Math.log(emptyCells + 1) * this.weights.empty;

    // Posisi tile tertinggi
    let maxTile = 0;
    let maxR = 0, maxC = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] > maxTile) {
          maxTile = board[r][c];
          maxR = r;
          maxC = c;
        }
      }
    }

    let cornerBonus = 0;
    const isCorner = (maxR === 0 || maxR === 3) && (maxC === 0 || maxC === 3);
    if (isCorner) {
      cornerBonus = this.weights.maxTileInCorner;
      if (maxR === 3) cornerBonus += 250; // Lebih menguntungkan jika di baris paling bawah
    } else {
      cornerBonus = -this.weights.maxTileInCorner;
    }

    const matrixScore = this.calculateMatrixGradient(board);

    return (
      monotonicity * this.weights.monotonicity +
      smoothness * this.weights.smoothness +
      emptyScore +
      cornerBonus +
      matrixScore
    );
  }

  calculateMatrixGradient(board) {
    const weightsDownLeft = [
      [  2,   4,   8,  16],
      [256, 128,  64,  32],
      [512, 1024, 2048, 4096],
      [65536, 32768, 16384, 8192]
    ];

    const weightsUpLeft = [
      [65536, 32768, 16384, 8192],
      [512, 1024, 2048, 4096],
      [256, 128,  64,  32],
      [  2,   4,   8,  16]
    ];

    let score1 = 0;
    let score2 = 0;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = board[r][c];
        score1 += val * weightsDownLeft[r][c];
        score2 += val * weightsUpLeft[r][c];
      }
    }

    return Math.max(score1, score2) * 0.05;
  }

  calculateSmoothness(board) {
    let smoothness = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] !== 0) {
          const val = Math.log2(board[r][c]);

          // Tetangga kanan
          for (let nextC = c + 1; nextC < 4; nextC++) {
            if (board[r][nextC] !== 0) {
              const targetVal = Math.log2(board[r][nextC]);
              smoothness -= Math.abs(val - targetVal);
              break;
            }
          }

          // Tetangga bawah
          for (let nextR = r + 1; nextR < 4; nextR++) {
            if (board[nextR][c] !== 0) {
              const targetVal = Math.log2(board[nextR][c]);
              smoothness -= Math.abs(val - targetVal);
              break;
            }
          }
        }
      }
    }
    return smoothness;
  }

  calculateMonotonicity(board) {
    const totals = [0, 0, 0, 0]; // Up/Down, Left/Right

    // Horizontal
    for (let r = 0; r < 4; r++) {
      let current = 0;
      let next = current + 1;
      while (next < 4) {
        while (next < 4 && board[r][next] === 0) next++;
        if (next >= 4) next--;

        const currentVal = board[r][current] !== 0 ? Math.log2(board[r][current]) : 0;
        const nextVal = board[r][next] !== 0 ? Math.log2(board[r][next]) : 0;

        if (currentVal > nextVal) {
          totals[0] += nextVal - currentVal;
        } else if (nextVal > currentVal) {
          totals[1] += currentVal - nextVal;
        }

        current = next;
        next++;
      }
    }

    // Vertikal
    for (let c = 0; c < 4; c++) {
      let current = 0;
      let next = current + 1;
      while (next < 4) {
        while (next < 4 && board[next][c] === 0) next++;
        if (next >= 4) next--;

        const currentVal = board[current][c] !== 0 ? Math.log2(board[current][c]) : 0;
        const nextVal = board[next][c] !== 0 ? Math.log2(board[next][c]) : 0;

        if (currentVal > nextVal) {
          totals[2] += nextVal - currentVal;
        } else if (nextVal > currentVal) {
          totals[3] += currentVal - nextVal;
        }

        current = next;
        next++;
      }
    }

    return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
  }

  countEmptyCells(board) {
    let count = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) count++;
      }
    }
    return count;
  }

  getEmptyCellCoordinates(board) {
    const cells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  hasPossibleMerges(board) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = board[r][c];
        if (val !== 0) {
          if (r < 3 && board[r + 1][c] === val) return true;
          if (c < 3 && board[r][c + 1] === val) return true;
        }
      }
    }
    return false;
  }

  getValidMoves(board) {
    const valid = [];
    for (let d = 0; d < 4; d++) {
      if (this.simulateMove(board, d).moved) {
        valid.push(d);
      }
    }
    return valid;
  }

  slideLine(line) {
    const filtered = line.filter(x => x !== 0);
    const result = [0, 0, 0, 0];
    let score = 0;
    let target = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const mergedVal = filtered[i] * 2;
        result[target++] = mergedVal;
        score += mergedVal;
        i++; // Lewati tile yang sudah digabung
      } else {
        result[target++] = filtered[i];
      }
    }

    let moved = false;
    for (let i = 0; i < 4; i++) {
      if (result[i] !== line[i]) {
        moved = true;
        break;
      }
    }

    return { result, score, moved };
  }

  /**
   * Simulasi cepat pergerakan papan 4x4 tanpa mutasi board asli
   * 0: Up, 1: Right, 2: Down, 3: Left
   */
  simulateMove(board, direction) {
    const newBoard = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    let totalScore = 0;
    let moved = false;

    if (direction === 3) { // LEFT
      for (let r = 0; r < 4; r++) {
        const { result, score, moved: lineMoved } = this.slideLine(board[r]);
        newBoard[r] = result;
        totalScore += score;
        if (lineMoved) moved = true;
      }
    } else if (direction === 1) { // RIGHT
      for (let r = 0; r < 4; r++) {
        const reversed = [board[r][3], board[r][2], board[r][1], board[r][0]];
        const { result, score, moved: lineMoved } = this.slideLine(reversed);
        newBoard[r] = [result[3], result[2], result[1], result[0]];
        totalScore += score;
        if (lineMoved) moved = true;
      }
    } else if (direction === 0) { // UP
      for (let c = 0; c < 4; c++) {
        const col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const { result, score, moved: lineMoved } = this.slideLine(col);
        for (let r = 0; r < 4; r++) {
          newBoard[r][c] = result[r];
        }
        totalScore += score;
        if (lineMoved) moved = true;
      }
    } else if (direction === 2) { // DOWN
      for (let c = 0; c < 4; c++) {
        const reversedCol = [board[3][c], board[2][c], board[1][c], board[0][c]];
        const { result, score, moved: lineMoved } = this.slideLine(reversedCol);
        newBoard[0][c] = result[3];
        newBoard[1][c] = result[2];
        newBoard[2][c] = result[1];
        newBoard[3][c] = result[0];
        totalScore += score;
        if (lineMoved) moved = true;
      }
    }

    return { board: newBoard, moved, scoreGained: totalScore };
  }
}
