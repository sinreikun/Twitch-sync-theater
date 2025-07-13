let players = [];

function addStream() {
  const input = document.getElementById('channel-input');
  const value = input.value.trim();
  if (!value) return;

  fetchStartTime(value).then(startTime => {
    createPlayer(value, startTime);
  });

  input.value = '';
}

function createPlayer(channel, startTime) {
  const container = document.getElementById('player-container');
  const iframe = document.createElement('iframe');
  iframe.src = `https://player.twitch.tv/?channel=${channel}&parent=${location.hostname}&autoplay=false`;
  iframe.height = 360;
  iframe.width = 640;
  container.appendChild(iframe);

  players.push({ channel, iframe, startTime, offset: 0 });
}

function syncPlayers() {
  const base = players[0];
  if (!base) return;
  const baseTime = Date.now() - base.startTime + base.offset;

  players.forEach(p => {
    const desired = p.startTime + baseTime - p.offset;
    const iframeWindow = p.iframe.contentWindow;
    if (iframeWindow && iframeWindow.Twitch && iframeWindow.Twitch.Player) {
      const player = iframeWindow.Twitch.Player.getPlayer();
      player.seek((desired - Date.now()) / 1000);
    }
  });
}

document.getElementById('add-button').addEventListener('click', addStream);
document.getElementById('sync-button').addEventListener('click', syncPlayers);
