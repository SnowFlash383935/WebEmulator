export default async function handler(req, res) {
    const { fileName, refresh_token } = req.query;

    if (!refresh_token || !fileName) {
        return res.status(400).json({ error: "MISSING_PARAMS" });
    }

    try {
        // 1. Обновляем access_token через Яндекс OAuth
        const tokenRes = await fetch('https://oauth.yandex.ru/token', {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: process.env.YANDEX_CLIENT_ID,
                client_secret: process.env.YANDEX_CLIENT_SECRET
            })
        });
        
        const tokenData = await tokenRes.json();
        const access_token = tokenData.access_token;

        if (!access_token) throw new Error("OAUTH_FAILED");

        // 2. Получаем прямую ссылку на файл читов в Яндексе
        // Путь фиксированный: SNES/cheats/ИмяИгры.cht
        const path = `SNES/cheats/${fileName}`;
        const linkRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `OAuth ${access_token}` }
        });

        if (!linkRes.ok) {
            console.log(`CHEATS_NOT_FOUND: ${path}`);
            return res.status(200).send("cheats = 0"); // Если нет читов, просто пустой конфиг
        }

        const { href } = await linkRes.json();

        // 3. Качаем содержимое файла
        const fileRes = await fetch(href);
        const rawText = await fileRes.text();

        // 4. Твой любимый парсер (Snes9x EX+ -> RetroArch)
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
        let cheats = [];
        let current = null;

        lines.forEach(line => {
            if (line.toLowerCase() === 'cheat') {
                if (current) cheats.push(current);
                current = { enable: true };
            } else if (line.startsWith('name:')) {
                current.name = line.replace('name:', '').trim();
            } else if (line.startsWith('code:')) {
                // Преобразуем формат: ADDR=VAL -> ADDR+VAL для RetroArch
                current.code = line.replace('code:', '').trim().replace('=', '+');
            }
        });
        if (current) cheats.push(current);

        // 5. Формируем ответ
        let output = [`cheats = ${cheats.length}`];
        cheats.forEach((c, i) => {
            output.push(`cheat${i}_desc = "${c.name || 'Cheat ' + i}"`);
            output.push(`cheat${i}_code = "${c.code}"`);
            output.push(`cheat${i}_enable = ${c.enable}`);
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(output.join('\n'));

    } catch (e) {
        console.error("CRITICAL_CHEATS_ERROR:", e.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
}
