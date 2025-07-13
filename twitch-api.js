const CLIENT_ID = '';
const OAUTH_TOKEN = '';

async function fetchStartTime(channel) {
  const url = `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(channel)}`;
  const res = await fetch(url, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${OAUTH_TOKEN}`
    }
  });
  if (!res.ok) return Date.now();
  const data = await res.json();
  const matched = data.data.find(c => c.display_name.toLowerCase() === channel.toLowerCase());
  if (!matched) return Date.now();

  // ここでは仮に現在時刻を返す。実際には配信開始時刻取得が必要
  return Date.now();
}
