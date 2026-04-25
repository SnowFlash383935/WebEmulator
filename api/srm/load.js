export default async function handler(req, res) {
  const { fileName, refresh_token } = req.query;
  const path = `SNES/saves/${fileName}`; // Путь к сейву в облаке

  try {
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

    // 2. Получаем ссылку на файл
    const linkRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
      headers: { 'Authorization': `OAuth ${access_token}` }
    });
    
    if (!linkRes.ok) return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
    const { href } = await linkRes.json();

    // 3. Проксируем байты
    const fileRes = await fetch(href);
    const buffer = await fileRes.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
