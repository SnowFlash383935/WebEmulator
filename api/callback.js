export default async function handler(req, res) {
  const { code } = req.query;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.YANDEX_CLIENT_ID,
    client_secret: process.env.YANDEX_CLIENT_SECRET
  });

  const response = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = await response.json();
  // Отправляем токены обратно на фронт в куки или URL (для MVP — в URL)
  res.redirect(`/?refresh_token=${data.refresh_token}`);
}
