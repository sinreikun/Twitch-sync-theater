let clientId = localStorage.getItem('clientId') || '';
let clientSecret = localStorage.getItem('clientSecret') || '';
let accessToken = '';
let tokenExpiry = 0;

function setCredentials(id, secret) {
  clientId = id;
  clientSecret = secret;
  localStorage.setItem('clientId', id);
  localStorage.setItem('clientSecret', secret);
  accessToken = '';
  tokenExpiry = 0;
}

function hasCredentials() {
  return !!clientId && !!clientSecret;
}

async function fetchToken() {
  if (!hasCredentials()) {
    throw new Error('missing credentials');
  }
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });
  if (!res.ok) {
    throw new Error('Failed to obtain Twitch token');
  }
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log("\u2705 Twitchアクセストークン取得成功。期限: " + new Date(tokenExpiry).toLocaleString());
}

async function ensureToken() {
  if (!hasCredentials()) {
    throw new Error('missing credentials');
  }
  if (!accessToken || Date.now() > tokenExpiry) {
    await fetchToken();
  }
}

async function apiFetch(url) {
  await ensureToken();
  let res = await fetch(url, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (res.status === 401) {
    console.warn('401 Unauthorized. Refreshing token');
    await fetchToken();
    res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Twitch API error ${res.status}: ${text}`);
    throw new Error('Twitch API error');
  }
  return res.json();
}

async function getUserId(loginName) {
  const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(loginName)}`;
  const data = await apiFetch(url);
  if (!data.data || data.data.length === 0) {
    console.warn('ユーザーID取得失敗', data);
    return null;
  }
  return data.data[0].id;
}

async function getLatestVODStartTime(userId) {
  const url = `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=1`;
  const data = await apiFetch(url);
  if (!data.data || data.data.length === 0) {
    console.warn('VOD取得失敗', data);
    return null;
  }
  const createdAt = new Date(data.data[0].created_at).getTime();
  console.log(`\u{1F4F9} latest VOD start: ${createdAt} (${new Date(createdAt).toLocaleString()})`);
  return createdAt;
}

async function getLiveStartTime(loginName) {
  const url = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(loginName)}`;
  const data = await apiFetch(url);
  if (!data.data || data.data.length === 0) {
    console.warn('LIVE取得失敗', data);
    return null;
  }
  const startedAt = new Date(data.data[0].started_at).getTime();
  console.log(`\u{1F4FA} live start: ${startedAt} (${new Date(startedAt).toLocaleString()})`);
  return startedAt;
}

async function getVideoStartTime(videoId) {
  const url = `https://api.twitch.tv/helix/videos?id=${videoId}`;
  const data = await apiFetch(url);
  if (!data.data || data.data.length === 0) {
    console.warn('VOD取得失敗', data);
    return null;
  }
  const createdAt = new Date(data.data[0].created_at).getTime();
  console.log(`\u{1F39B} VOD start: ${createdAt} (${new Date(createdAt).toLocaleString()})`);
  return createdAt;
}

async function getVideoInfo(videoId) {
  const url = `https://api.twitch.tv/helix/videos?id=${videoId}`;
  const data = await apiFetch(url);
  if (!data.data || data.data.length === 0) {
    console.warn('VOD取得失敗', data);
    return null;
  }
  const item = data.data[0];
  const createdAt = new Date(item.created_at).getTime();
  const durationStr = item.duration || '';
  let durSec = 0;
  durationStr.replace(/(\d+)([hms])/g, (_, n, unit) => {
    n = parseInt(n, 10);
    if (unit === 'h') durSec += n * 3600;
    if (unit === 'm') durSec += n * 60;
    if (unit === 's') durSec += n;
  });
  console.log(`\u{1F39B} VOD start: ${createdAt} (${new Date(createdAt).toLocaleString()})`);
  return { createdAt, userId: item.user_id, duration: durSec };
}

async function init() {
  if (!hasCredentials()) {
    throw new Error('missing credentials');
  }
  await fetchToken();
}

window.TwitchAPI = {
  init,
  setCredentials,
  hasCredentials,
  getUserId,
  getLatestVODStartTime,
  getLiveStartTime,
  getVideoStartTime,
  getVideoInfo
};
