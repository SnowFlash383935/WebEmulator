import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { path, refresh_token } = req.query;

  // 1. Обновляем access_token через refresh_token
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

  // 2. Получаем ссылку на скачивание
  const linkRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
    headers: { 'Authorization': `OAuth ${access_token}` }
  });
  const { href } = await linkRes.json();

  // 3. Проксируем сам файл (Обход CORS)
  const fileRes = await fetch(href);
  const arrayBuffer = await fileRes.arrayBuffer();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(arrayBuffer));
}
