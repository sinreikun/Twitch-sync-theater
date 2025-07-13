let players = [];
let earliestStart = null;

const seekBar = document.getElementById('seek-bar');
const seekTime = document.getElementById('seek-time');
const sidebar = document.getElementById('sidebar');

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

document.getElementById('toggle-sidebar').addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

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
  const withChat = document.getElementById('with-chat').checked;

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
  createPlayer(label, options, startTime, withChat);
}

function createPlayer(label, options, startTime, withChat) {
  const container = document.getElementById('player-container');
  const wrapper = document.createElement('div');
  wrapper.className = 'player-wrapper';
  const div = document.createElement('div');
  const id = `tw-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  div.id = id;

  const overlay = document.createElement('div');
  overlay.className = 'player-overlay';

  const mute = document.createElement('button');
  mute.textContent = '🔈';
  const minus = document.createElement('button');
  minus.textContent = '-1s';
  const plus = document.createElement('button');
  plus.textContent = '+1s';
  const display = document.createElement('span');
  display.className = 'offset-display';
  display.textContent = '0s';
  const remove = document.createElement('button');
  remove.textContent = '×';

  overlay.appendChild(mute);
  overlay.appendChild(minus);
  overlay.appendChild(display);
  overlay.appendChild(plus);
  overlay.appendChild(remove);

  wrapper.appendChild(div);
  wrapper.appendChild(overlay);
  container.appendChild(wrapper);

  if (withChat && options.channel) {
    const chat = document.createElement('iframe');
    chat.src = `https://www.twitch.tv/embed/${options.channel}/chat?parent=${location.hostname}`;
    chat.width = "100%";
    chat.height = "200";
    wrapper.appendChild(chat);
  }

  const playerInstance = new Twitch.Player(id, options);
  const player = { label, player: playerInstance, startTime, offset: 0, offsetDisplay: display };
  minus.addEventListener('click', () => adjustOffset(player, -1));
  plus.addEventListener('click', () => adjustOffset(player, 1));
  mute.addEventListener('click', () => {
    const muted = playerInstance.getMuted();
    playerInstance.setMuted(!muted);
    mute.textContent = muted ? '🔈' : '🔇';
  });
  remove.addEventListener('click', () => {
    wrapper.remove();
    players = players.filter(p => p !== player);
    if (players.length === 0) {
      earliestStart = null;
    } else {
      earliestStart = Math.min(...players.map(p => p.startTime));
    }
  });

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
