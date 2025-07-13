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
    p.player.seek(sec);
  });
}

async function addStream() {
  const input = document.getElementById('channel-input');
  const val = input.value.trim();
  if (!val) return;
  input.value = '';

  let startTime = null;
  let label = val;
  let options = {
    width: 640,
    height: 360,
    parent: [location.hostname]
  };

  const match = val.match(/videos\/(\d+)/);
  if (match) {
    const videoId = match[1];
    try {
      startTime = await TwitchAPI.getVideoStartTime(videoId);
    } catch (e) {
      console.error(e);
    }
    options.video = videoId;
    label = `v${videoId}`;
  } else {
    const login = val.toLowerCase();
    try {
      startTime = await TwitchAPI.getLiveStartTime(login);
      if (!startTime) {
        const uid = await TwitchAPI.getUserId(login);
        if (uid) startTime = await TwitchAPI.getLatestVODStartTime(uid);
      }
    } catch (e) {
      console.error(e);
    }
    options.channel = login;
  }

  if (!startTime) {
    alert('開始時刻を取得できませんでした。とりあえず追加します。');
    startTime = Date.now();
  }
  createPlayer(label, options, startTime);
}

function createPlayer(label, options, startTime) {
  const container = document.getElementById('player-container');
  const wrapper = document.createElement('div');
  wrapper.className = 'player-wrapper';
  const div = document.createElement('div');
  const id = `tw-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  div.id = id;

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

  wrapper.appendChild(div);
  wrapper.appendChild(controls);
  container.appendChild(wrapper);

  const playerInstance = new Twitch.Player(id, options);
  const player = { label, player: playerInstance, startTime, offset: 0, offsetDisplay: display };
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
