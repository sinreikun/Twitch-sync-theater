const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';
let accessToken = '';
let tokenExpiry = 0;

async function fetchToken() {
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
}

async function ensureToken() {
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
    await fetchToken();
    res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }
  if (!res.ok) {
    throw new Error('Twitch API error');
  }
  return res.json();
}

async function getUserId(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(loginName)}`);
  return data.data && data.data.length > 0 ? data.data[0].id : null;
}

async function getLatestVODStartTime(userId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?user_id=${userId}&first=1&type=archive&sort=time`);
  return data.data && data.data.length > 0 ? new Date(data.data[0].created_at).getTime() : null;
}

async function getLiveStartTime(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(loginName)}`);
  return data.data && data.data.length > 0 ? new Date(data.data[0].started_at).getTime() : null;
}

async function getVideoStartTime(videoId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?id=${videoId}`);
  return data.data && data.data.length > 0 ? new Date(data.data[0].created_at).getTime() : null;
}

function init() {
  fetchToken().catch(console.error);
}

window.TwitchAPI = {
  init,
  getUserId,
  getLatestVODStartTime,
  getLiveStartTime,
  getVideoStartTime
};
