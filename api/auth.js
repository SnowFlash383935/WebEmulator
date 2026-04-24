export default function handler(req, res) {
  const url = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${process.env.YANDEX_CLIENT_ID}`;
  res.redirect(url);
}
