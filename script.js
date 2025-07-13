let players = [];
let earliestStart = null;

const seekBar = document.getElementById('seek-bar');
const seekTime = document.getElementById('seek-time');

function formatTime(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateSeekDisplay() {
  seekTime.textContent = formatTime(parseInt(seekBar.value, 10));
}

function loadCredentials() {
  const id = localStorage.getItem('clientId') || '';
  const token = localStorage.getItem('oauthToken') || '';
  document.getElementById('client-id').value = id;
  document.getElementById('oauth-token').value = token;
  if (id && token) {
    TwitchAPI.setCredentials(id, token);
  }
}

function saveCredentials() {
  const id = document.getElementById('client-id').value.trim();
  const token = document.getElementById('oauth-token').value.trim();
  TwitchAPI.setCredentials(id, token);
}

function adjustOffset(player, diff) {
  player.offset += diff;
  player.offsetDisplay.textContent = `${player.offset}s`;
  syncPlayers();
}

function syncPlayers() {
  if (players.length === 0 || earliestStart === null) return;
  const baseSeconds = parseInt(seekBar.value, 10);
  const baseTime = earliestStart + baseSeconds * 1000;

  players.forEach(p => {
    let sec = (baseTime - p.startTime) / 1000 + p.offset;
    if (sec < 0) sec = 0;
    p.iframe.contentWindow.postMessage({ event: 'command', func: 'seek', args: [sec] }, '*');
  });
}

async function addStream() {
  const input = document.getElementById('channel-input');
  const val = input.value.trim();
  if (!val) return;
  input.value = '';

  let url;
  let startTime = null;
  let label = val;

  const match = val.match(/videos\/(\d+)/);
  if (match) {
    const videoId = match[1];
    startTime = await TwitchAPI.getVideoStartTime(videoId);
    url = `https://player.twitch.tv/?video=${videoId}&parent=${location.hostname}&autoplay=false`;
    label = `v${videoId}`;
  } else {
    const login = val.toLowerCase();
    startTime = await TwitchAPI.getLiveStartTime(login);
    if (!startTime) {
      const uid = await TwitchAPI.getUserId(login);
      if (uid) startTime = await TwitchAPI.getLatestVODStartTime(uid);
    }
    url = `https://player.twitch.tv/?channel=${login}&parent=${location.hostname}&autoplay=false`;
  }

  if (!startTime) {
    alert('開始時刻を取得できませんでした');
    return;
  }

  createPlayer(label, url, startTime);
}

function createPlayer(label, url, startTime) {
  const container = document.getElementById('player-container');
  const wrapper = document.createElement('div');
  wrapper.className = 'player-wrapper';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.height = 360;
  iframe.width = 640;
  iframe.allow = 'autoplay; fullscreen';

  const controls = document.createElement('div');
  controls.className = 'player-controls';

  const minus = document.createElement('button');
  minus.textContent = '-1s';
  const plus = document.createElement('button');
  plus.textContent = '+1s';
  const display = document.createElement('span');
  display.textContent = '0s';

  controls.appendChild(minus);
  controls.appendChild(display);
  controls.appendChild(plus);

  wrapper.appendChild(iframe);
  wrapper.appendChild(controls);
  container.appendChild(wrapper);

  const player = { label, iframe, startTime, offset: 0, offsetDisplay: display };
  minus.addEventListener('click', () => adjustOffset(player, -1));
  plus.addEventListener('click', () => adjustOffset(player, 1));

  players.push(player);

  if (!earliestStart || startTime < earliestStart) {
    earliestStart = startTime;
    seekBar.value = 0;
    updateSeekDisplay();
  }
}

seekBar.addEventListener('input', () => {
  updateSeekDisplay();
  syncPlayers();
});

document.getElementById('add-button').addEventListener('click', addStream);
document.getElementById('sync-button').addEventListener('click', syncPlayers);
document.getElementById('save-api').addEventListener('click', saveCredentials);
window.addEventListener('DOMContentLoaded', () => {
  loadCredentials();
  updateSeekDisplay();
});
