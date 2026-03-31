(function() {
  var COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];

  // Inject CSS
  var style = document.createElement('style');
  style.textContent =
    '.ms-wrap{display:flex;flex-direction:column;align-items:center;padding:6px;background:#c0c0c0;height:100%}' +
    '.ms-board{border:3px solid;border-color:#808080 #fff #fff #808080;padding:0}' +
    '.ms-header{display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border:2px solid;border-color:#808080 #fff #fff #808080;margin-bottom:6px;background:#c0c0c0}' +
    '.ms-counter,.ms-timer{background:#000;color:#f00;font-family:"Courier New",monospace;font-size:20px;font-weight:bold;padding:2px 4px;min-width:42px;text-align:center;border:1px solid;border-color:#808080 #fff #fff #808080}' +
    '.ms-face{width:26px;height:26px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #808080 #808080 #dfdfdf;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;padding:0}' +
    '.ms-face:active{border-color:#808080 #dfdfdf #dfdfdf #808080}' +
    '.ms-row{display:flex}' +
    '.ms-cell{width:16px;height:16px;border:2px solid;border-color:#fff #808080 #808080 #fff;background:#c0c0c0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;cursor:default;user-select:none}' +
    '.ms-cell.revealed{border:1px solid #808080;background:#c0c0c0}' +
    '.ms-cell.mine-hit{background:#f00}' +
    '.ms-cell.flagged::after{content:"\\25B6";color:#f00;font-size:10px}' +
    '.ms-menubar{width:100%;background:#c0c0c0;display:flex;height:20px;align-items:stretch;border-bottom:1px solid #808080;flex-shrink:0;margin-bottom:4px}' +
    '.ms-menu-item{padding:1px 8px;cursor:default;display:flex;align-items:center;font-size:11px}' +
    '.ms-menu-item:hover{background:#000080;color:#fff}';
  document.head.appendChild(style);

  function open() {
    if (WM.exists('minesweeper')) { WM.show('minesweeper'); return; }

    var ROWS = 9, COLS = 9, MINES = 10;
    var grid, revealed, flagged, gameOver, gameWon, firstClick, timer, timerInterval, minesLeft;

    var body = WM.create('minesweeper', {
      title: 'Minesweeper',
      icon: 'icons/minesweeper.png',
      x: 200, y: 60, width: 220, height: 340,
      onClose: function() { clearInterval(timerInterval); },
    });

    body.innerHTML =
      '<div class="ms-menubar">' +
        '<div class="ms-menu-item" onclick="MSApp.newGame()"><u>G</u>ame</div>' +
      '</div>' +
      '<div class="ms-wrap">' +
        '<div class="ms-header" id="ms-header">' +
          '<div class="ms-counter" id="ms-mines">010</div>' +
          '<div class="ms-face" id="ms-face" onclick="MSApp.newGame()">&#128578;</div>' +
          '<div class="ms-timer" id="ms-timer">000</div>' +
        '</div>' +
        '<div class="ms-board" id="ms-board"></div>' +
      '</div>';

    function initGame() {
      grid = []; revealed = []; flagged = [];
      gameOver = false; gameWon = false; firstClick = true;
      timer = 0; minesLeft = MINES;
      clearInterval(timerInterval); timerInterval = null;
      document.getElementById('ms-face').innerHTML = '&#128578;';
      document.getElementById('ms-timer').textContent = '000';
      document.getElementById('ms-mines').textContent = pad(minesLeft);

      for (var r = 0; r < ROWS; r++) {
        grid[r] = []; revealed[r] = []; flagged[r] = [];
        for (var c = 0; c < COLS; c++) { grid[r][c] = 0; revealed[r][c] = false; flagged[r][c] = false; }
      }
      renderBoard();
    }

    function placeMines(safeR, safeC) {
      var placed = 0;
      while (placed < MINES) {
        var r = Math.floor(Math.random() * ROWS);
        var c = Math.floor(Math.random() * COLS);
        if (grid[r][c] === -1) continue;
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        grid[r][c] = -1; placed++;
      }
      // Count neighbors
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (grid[r][c] === -1) continue;
          var count = 0;
          for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === -1) count++;
          }
          grid[r][c] = count;
        }
      }
    }

    function renderBoard() {
      var board = document.getElementById('ms-board');
      board.innerHTML = '';
      for (var r = 0; r < ROWS; r++) {
        var row = document.createElement('div');
        row.className = 'ms-row';
        for (var c = 0; c < COLS; c++) {
          var cell = document.createElement('div');
          cell.className = 'ms-cell';
          cell.dataset.r = r; cell.dataset.c = c;
          if (revealed[r][c]) {
            cell.classList.add('revealed');
            if (grid[r][c] === -1) { cell.textContent = '●'; cell.style.color = '#000'; }
            else if (grid[r][c] > 0) { cell.textContent = grid[r][c]; cell.style.color = COLORS[grid[r][c]]; }
          } else if (flagged[r][c]) {
            cell.classList.add('flagged');
          }
          row.appendChild(cell);
        }
        board.appendChild(row);
      }

      board.onmousedown = function(e) {
        var cell = e.target.closest('.ms-cell');
        if (!cell || gameOver || gameWon) return;
        var r = +cell.dataset.r, c = +cell.dataset.c;
        if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
          e.preventDefault();
          if (!revealed[r][c]) {
            flagged[r][c] = !flagged[r][c];
            minesLeft += flagged[r][c] ? -1 : 1;
            document.getElementById('ms-mines').textContent = pad(minesLeft);
            renderBoard();
          }
        } else if (e.button === 0) {
          if (flagged[r][c]) return;
          if (firstClick) { firstClick = false; placeMines(r, c); startTimer(); }
          if (grid[r][c] === -1) { lose(r, c); }
          else { reveal(r, c); checkWin(); }
          renderBoard();
        }
      };
      board.oncontextmenu = function(e) { e.preventDefault(); };
    }

    function reveal(r, c) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      if (revealed[r][c] || flagged[r][c]) return;
      revealed[r][c] = true;
      if (grid[r][c] === 0) {
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc);
      }
    }

    function lose(r, c) {
      gameOver = true; clearInterval(timerInterval);
      document.getElementById('ms-face').innerHTML = '&#128565;';
      // Reveal all mines
      for (var i = 0; i < ROWS; i++) for (var j = 0; j < COLS; j++) {
        if (grid[i][j] === -1) revealed[i][j] = true;
      }
      renderBoard();
      var hit = document.querySelector('.ms-cell[data-r="' + r + '"][data-c="' + c + '"]');
      if (hit) hit.classList.add('mine-hit');
    }

    function checkWin() {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (grid[r][c] !== -1 && !revealed[r][c]) return;
      }
      gameWon = true; clearInterval(timerInterval);
      document.getElementById('ms-face').innerHTML = '&#128526;';
    }

    function startTimer() {
      timerInterval = setInterval(function() {
        timer++;
        document.getElementById('ms-timer').textContent = pad(timer);
      }, 1000);
    }

    function pad(n) { var s = '' + Math.max(0, Math.min(999, n)); while (s.length < 3) s = '0' + s; return s; }

    // Expose for menu
    window.MSApp = { newGame: initGame };

    initGame();
  }

  AppRegistry.register('minesweeper', {
    title: 'Minesweeper',
    icon: 'icons/minesweeper.png',
    description: 'Classic puzzle game',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
