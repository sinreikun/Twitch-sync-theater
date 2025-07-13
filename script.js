let players = [];
let earliestStart = null;
let markers = [];

const seekBar = document.getElementById('seek-bar');
const seekTime = document.getElementById('seek-time');
const markersContainer = document.getElementById('markers');
const sidebar = document.getElementById('sidebar');
const vodList = document.getElementById('vod-list');
const clientIdInput = document.getElementById('client-id');
const clientSecretInput = document.getElementById('client-secret');
const apiError = document.getElementById('api-error');

function formatTime(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateSeekDisplay() {
  seekTime.textContent = formatTime(parseInt(seekBar.value, 10));
}

function updateMarkers() {
  markersContainer.innerHTML = '';
  if (!earliestStart) return;
  const max = parseInt(seekBar.max, 10);
  players.forEach(p => {
    const diff = Math.round((p.startTime - earliestStart) / 1000);
    if (diff < 0 || diff > max) return;
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.left = `${diff / max * 100}%`;
    const label = document.createElement('span');
    label.textContent = formatTime(diff);
    marker.appendChild(label);
    markersContainer.appendChild(marker);
  });
}


document.getElementById('toggle-sidebar').addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

function adjustOffset(player, diff) {
  player.offset += diff;
  player.offsetDisplay.textContent = `${player.offset}s`;
  if (player.infoOffset) player.infoOffset.textContent = `${player.offset}s`;
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
    if (p.infoTime) p.infoTime.textContent = new Date(baseTime + p.offset * 1000).toLocaleString();
  });
}

async function addStream() {
  const input = document.getElementById('channel-input');
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  const withChat = document.getElementById('with-chat').checked;

  if (!TwitchAPI.hasCredentials()) {
    apiError.textContent = 'API設定が未完了です';
    return;
  } else {
    apiError.textContent = '';
  }

  let startTime = null;
  let label = val;
  let videoId = null;
  let userId = null;
  let options = {
    width: 640,
    height: 360,
    parent: [location.hostname]
  };

  const match = val.match(/twitch\.tv\/videos\/(\d+)/);
  if (val.includes('twitch.tv/videos') && !match) {
    alert('VODのIDを抽出できませんでした');
    return;
  }
  if (match) {
    videoId = match[1];
    console.log(`\u{1F3AC} VOD ID: ${videoId}`);
    try {
      const info = await TwitchAPI.getVideoInfo(videoId);
      if (info) {
        startTime = info.createdAt;
        userId = info.userId;
      }
    } catch (e) {
      console.error(e);
      apiError.textContent = '認証情報が正しいか確認してください';
      return;
    }
    options.video = videoId;
    label = `v${videoId}`;
  } else if (/^\d+$/.test(val)) {
    videoId = val;
    console.log(`\u{1F3AC} VOD ID: ${videoId}`);
    try {
      const info = await TwitchAPI.getVideoInfo(videoId);
      if (info) {
        startTime = info.createdAt;
        userId = info.userId;
      }
    } catch (e) {
      console.error(e);
      apiError.textContent = '認証情報が正しいか確認してください';
      return;
    }
    options.video = videoId;
    label = `v${videoId}`;
  } else {
    const login = val.toLowerCase();
    try {
      startTime = await TwitchAPI.getLiveStartTime(login);
      if (!startTime) {
        const uid = await TwitchAPI.getUserId(login);
        if (uid) {
          userId = uid;
          startTime = await TwitchAPI.getLatestVODStartTime(uid);
        }
      }
      if (!userId) {
        userId = await TwitchAPI.getUserId(login);
      }
    } catch (e) {
      console.error(e);
      apiError.textContent = '認証情報が正しいか確認してください';
      return;
    }
    options.channel = login;
  }

  if (!startTime) {
    alert('開始時刻を取得できませんでした');
    return;
  }
  createPlayer(label, options, startTime, withChat, videoId, userId);
  apiError.textContent = '';
}

function createPlayer(label, options, startTime, withChat, videoId, userId) {
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
  const info = document.createElement('div');
  info.className = 'vod-info';
  info.innerHTML = `<div>🆔 <span class="vid">${videoId ? videoId : 'LIVE'}</span></div>` +
    `<div>👤 <span class="uid">${userId || ''}</span></div>` +
    `<div>⏰ <span class="ptime"></span></div>`;
  const ctrl = document.createElement('div');
  ctrl.className = 'controls';
  const minus2 = document.createElement('button');
  minus2.textContent = '-1s';
  const plus2 = document.createElement('button');
  plus2.textContent = '+1s';
  const off2 = document.createElement('span');
  off2.textContent = '0s';
  ctrl.appendChild(minus2);
  ctrl.appendChild(off2);
  ctrl.appendChild(plus2);
  info.appendChild(ctrl);
  vodList.appendChild(info);

  const player = { label, player: playerInstance, startTime, offset: 0, offsetDisplay: display, infoTime: info.querySelector('.ptime'), infoOffset: off2, infoElem: info };
  minus.addEventListener('click', () => adjustOffset(player, -1));
  plus.addEventListener('click', () => adjustOffset(player, 1));
  minus2.addEventListener('click', () => adjustOffset(player, -1));
  plus2.addEventListener('click', () => adjustOffset(player, 1));
  mute.addEventListener('click', () => {
    const muted = playerInstance.getMuted();
    playerInstance.setMuted(!muted);
    mute.textContent = muted ? '🔈' : '🔇';
  });
  remove.addEventListener('click', () => {
    wrapper.remove();
    info.remove();
    players = players.filter(p => p !== player);
    if (players.length === 0) {
      earliestStart = null;
    } else {
      earliestStart = Math.min(...players.map(p => p.startTime));
    }
    const maxDiff = players.length === 0 ? 0 : Math.max(...players.map(p => (p.startTime - earliestStart) / 1000));
    seekBar.max = Math.max(7200, Math.ceil(maxDiff) + 300);
    updateMarkers();
  });

  players.push(player);

  if (!earliestStart || startTime < earliestStart) {
    earliestStart = startTime;
    seekBar.value = 0;
    updateSeekDisplay();
  }
  const maxDiff = Math.max(...players.map(p => (p.startTime - earliestStart) / 1000));
  seekBar.max = Math.max(7200, Math.ceil(maxDiff) + 300);
  updateMarkers();
}

seekBar.addEventListener('input', () => {
  updateSeekDisplay();
  syncPlayers();
});

document.getElementById('add-button').addEventListener('click', addStream);
document.getElementById('sync-button').addEventListener('click', syncPlayers);
document.getElementById('save-api').addEventListener('click', async () => {
  const id = clientIdInput.value.trim();
  const secret = clientSecretInput.value.trim();
  TwitchAPI.setCredentials(id, secret);
  try {
    await TwitchAPI.init();
    apiError.textContent = '';
  } catch (e) {
    console.error(e);
    apiError.textContent = '認証情報が正しいか確認してください';
  }
});
document.getElementById('open-dev').addEventListener('click', () => {
  window.open('https://dev.twitch.tv/console/apps', '_blank');
});
window.addEventListener('DOMContentLoaded', async () => {
  clientIdInput.value = localStorage.getItem('clientId') || '';
  clientSecretInput.value = localStorage.getItem('clientSecret') || '';
  if (TwitchAPI.hasCredentials()) {
    try {
      await TwitchAPI.init();
    } catch (e) {
      console.error(e);
      apiError.textContent = '認証情報が正しいか確認してください';
    }
  } else {
    apiError.textContent = 'API設定が未完了です';
  }
  updateSeekDisplay();
});

setInterval(() => {
  players.forEach(p => {
    if (p.infoTime) {
      const t = new Date(p.startTime + p.player.getCurrentTime() * 1000);
      p.infoTime.textContent = t.toLocaleString();
    }
  });
}, 1000);
