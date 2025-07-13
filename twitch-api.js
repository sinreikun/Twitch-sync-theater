let CLIENT_ID = localStorage.getItem('clientId') || '';
let OAUTH_TOKEN = localStorage.getItem('oauthToken') || '';

function setCredentials(id, token) {
  CLIENT_ID = id;
  OAUTH_TOKEN = token;
  localStorage.setItem('clientId', id);
  localStorage.setItem('oauthToken', token);
}

async function apiFetch(url) {
  const res = await fetch(url, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${OAUTH_TOKEN}`
    }
  });
  if (!res.ok) {
    throw new Error('Twitch API error');
  }
  return res.json();
}

async function getUserId(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(loginName)}`);
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  }
  return null;
}

async function getLatestVODStartTime(userId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?user_id=${userId}&first=1&type=archive&sort=time`);
  if (data.data && data.data.length > 0) {
    return new Date(data.data[0].created_at).getTime();
  }
  return null;
}

async function getLiveStartTime(loginName) {
  const data = await apiFetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(loginName)}`);
  if (data.data && data.data.length > 0) {
    return new Date(data.data[0].started_at).getTime();
  }
  return null;
}

async function getVideoStartTime(videoId) {
  const data = await apiFetch(`https://api.twitch.tv/helix/videos?id=${videoId}`);
  if (data.data && data.data.length > 0) {
    return new Date(data.data[0].created_at).getTime();
  }
  return null;
}

window.TwitchAPI = {
  setCredentials,
  getUserId,
  getLatestVODStartTime,
  getLiveStartTime,
  getVideoStartTime
};
