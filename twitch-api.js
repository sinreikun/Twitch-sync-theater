const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
let tokenInfo = null;

async function fetchToken() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials'
  });
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params
  });
  if (!res.ok) {
    throw new Error('Failed to get token');
  }
  const data = await res.json();
  tokenInfo = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
}

async function ensureToken() {
  if (!tokenInfo || tokenInfo.expires_at <= Date.now()) {
    await fetchToken();
  }
}

async function apiFetch(url) {
  await ensureToken();
  const res = await fetch(url, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${tokenInfo.access_token}`
    }
  });
  if (!res.ok) {
    if (res.status === 401) {
      tokenInfo = null;
      return apiFetch(url);
    }
    throw new Error('Twitch API error');
  }
  return res.json();
}

async function getUserId(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(loginName)}`);
  if (data.data && data.data.length > 0) return data.data[0].id;
  return null;
}

async function getLatestVODStartTime(userId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?user_id=${userId}&first=1&type=archive&sort=time`);
  if (data.data && data.data.length > 0) return new Date(data.data[0].created_at).getTime();
  return null;
}

async function getLiveStartTime(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(loginName)}`);
  if (data.data && data.data.length > 0) return new Date(data.data[0].started_at).getTime();
  return null;
}

async function getVideoStartTime(videoId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?id=${videoId}`);
  if (data.data && data.data.length > 0) return new Date(data.data[0].created_at).getTime();
  return null;
}

function init() {
  ensureToken().catch(console.error);
}

window.TwitchAPI = {
  init,
  getUserId,
  getLatestVODStartTime,
  getLiveStartTime,
  getVideoStartTime
};
