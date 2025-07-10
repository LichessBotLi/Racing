async function loadAndParsePGN() {
  const response = await fetch('bijiy2.pgn');
  const rawPGN = await response.text();

  const games = rawPGN.split(/\n\n(?=Event )/g); // Split PGNs
  const opponents = {}; // { opponentName: { rating, wins: Set, draws: Set } }

  for (const gameText of games) {
    if (!gameText.trim()) continue;

    // Extract basic PGN data
    const headers = {};
    for (const line of gameText.split("\n")) {
      const match = line.match(/^(\w+)\s+"(.*)"$/);
      if (match) headers[match[1]] = match[2];
    }

    const white = headers.White || '';
    const black = headers.Black || '';
    const whiteElo = parseInt(headers.WhiteElo || "0");
    const blackElo = parseInt(headers.BlackElo || "0");
    const result = headers.Result || '';

    // Determine winner
    const winner = result === '1-0' ? white
                : result === '0-1' ? black
                : 'draw';

    // We assume the winner is "you"
    const opponent = winner === white ? black : winner === black ? white : 'draw';
    const opponentElo = winner === white ? blackElo : winner === black ? whiteElo : Math.max(whiteElo, blackElo);

    if (opponent === 'draw') continue; // We'll handle draw later

    const moveText = gameText.split(/\n\n/)[1] || '';
    const hash = btoa(moveText).slice(0, 20); // hash to deduplicate

    // Initialize opponent entry
    if (!opponents[opponent]) {
      opponents[opponent] = { rating: opponentElo, wins: new Map(), draws: new Map() };
    }
    if (opponentElo > opponents[opponent].rating) {
      opponents[opponent].rating = opponentElo;
    }

    // Store win or draw
    if (winner !== 'draw') {
      if (!opponents[opponent].wins.has(hash)) {
        opponents[opponent].wins.set(hash, gameText);
      }
    } else {
      if (!opponents[opponent].draws.has(hash)) {
        opponents[opponent].draws.set(hash, gameText);
      }
    }
  }

  render(opponents);
}

function render(opponents) {
  const output = document.getElementById('output');
  const sorted = Object.entries(opponents).sort((a, b) => b[1].rating - a[1].rating);
  let boardId = 1;

  for (const [name, data] of sorted) {
    const section = document.createElement('section');
    section.innerHTML = `<h2>${name} (${data.rating})</h2>`;

    if (data.wins.size > 0) {
      section.innerHTML += `<h3>Wins</h3>`;
      for (const [_, pgn] of data.wins) {
        section.innerHTML += `
<div class="pgn-container">
  <div class="pgn" id="board${boardId}">
[Event "Racing Kings Game"]
[SetUp "1"]
[FEN "startpos"]
${pgn}
  </div>
</div>`;
        boardId++;
      }
    }

    if (data.draws.size > 0) {
      section.innerHTML += `<h3>Draws</h3>`;
      for (const [_, pgn] of data.draws) {
        section.innerHTML += `
<div class="pgn-container">
  <div class="pgn" id="board${boardId}">
[Event "Racing Kings Game"]
[SetUp "1"]
[FEN "startpos"]
${pgn}
  </div>
</div>`;
        boardId++;
      }
    }

    output.appendChild(section);
  }

  if (typeof PGNViewerInit === 'function') PGNViewerInit();
}

loadAndParsePGN();
