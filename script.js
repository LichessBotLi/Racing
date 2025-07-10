async function loadAndParsePGN() {
  const response = await fetch('bijiy2.pgn');
  const rawPGN = await response.text();

  const games = rawPGN.split(/\n\n(?=Event )/g); // Split PGNs
  const opponents = {}; // { name: { rating, wins: Set, draws: Set } }

  for (const gameText of games) {
    if (!gameText.trim()) continue;

    const resultMatch = gameText.match(/Result "(.*?)"/);
    const whiteMatch = gameText.match(/White "(.*?)"/);
    const blackMatch = gameText.match(/Black "(.*?)"/);
    const whiteEloMatch = gameText.match(/WhiteElo "(.*?)"/);
    const blackEloMatch = gameText.match(/BlackElo "(.*?)"/);

    const result = resultMatch?.[1] || '';
    const white = whiteMatch?.[1] || '';
    const black = blackMatch?.[1] || '';
    const whiteElo = parseInt(whiteEloMatch?.[1]) || 0;
    const blackElo = parseInt(blackEloMatch?.[1]) || 0;

    const self = (white.toLowerCase() === 'utsa') ? white : black;
    const opponent = (self === white) ? black : white;
    const opponentElo = (self === white) ? blackElo : whiteElo;
    const isWin = (self === white && result === '1-0') || (self === black && result === '0-1');
    const isDraw = result === '1/2-1/2';

    const moveText = gameText.split(/\n\n/)[1] || '';
    const hash = btoa(moveText).slice(0, 20);

    if (!opponents[opponent]) {
      opponents[opponent] = { rating: opponentElo, wins: new Map(), draws: new Map() };
    }
    if (opponentElo > opponents[opponent].rating) {
      opponents[opponent].rating = opponentElo;
    }

    if (isWin && !opponents[opponent].wins.has(hash)) {
      opponents[opponent].wins.set(hash, gameText);
    } else if (isDraw && !opponents[opponent].draws.has(hash)) {
      opponents[opponent].draws.set(hash, gameText);
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
