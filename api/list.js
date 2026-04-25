export default async function handler(req, res) {
  const { refresh_token } = req.query;
  const path = 'SNES/games';

  // 1. Обновляем токен
  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.YANDEX_CLIENT_ID,
      client_secret: process.env.YANDEX_CLIENT_SECRET
    })
  });
  const { access_token } = await tokenRes.json();

  // 2. Получаем список файлов
  const listRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&limit=100`, {
    headers: { 'Authorization': `OAuth ${access_token}` }
  });
  const data = await listRes.json();

  // Фильтруем только файлы с расширением .sfc или .smc
  const games = data._embedded.items
    .filter(item => item.type === 'file' && (item.name.endsWith('.sfc') || item.name.endsWith('.smc')))
    .map(item => item.name);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(games);
}
