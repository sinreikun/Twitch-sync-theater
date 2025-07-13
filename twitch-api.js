let clientId = '';
let oauthToken = '';

function loadCredentials() {
  clientId = localStorage.getItem('twitch_client_id') || '';
  oauthToken = localStorage.getItem('twitch_oauth_token') || '';
}

function saveCredentials(id, token) {
  clientId = id;
  oauthToken = token;
  localStorage.setItem('twitch_client_id', id);
  localStorage.setItem('twitch_oauth_token', token);
}

function apiFetch(url) {
  if (!clientId || !oauthToken) {
    return Promise.reject(new Error('Missing Twitch API credentials'));
  }
  return fetch(url, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}`
    }
  }).then(res => {
    if (!res.ok) {
      throw new Error('Twitch API error');
    }
    return res.json();
  });
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
  loadCredentials();
}

window.TwitchAPI = {
  init,
  getUserId,
  getLatestVODStartTime,
  getLiveStartTime,
  getVideoStartTime,
  saveCredentials
};
