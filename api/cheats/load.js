export default async function handler(req, res) {
    const { refresh_token, fileName } = req.query;
    
    // ЛОГ ДЛЯ ТЕБЯ: Проверяем, что пришло на бэкенд
    console.log(`FETCHING CHEATS FOR: ${fileName}`);

    if (!refresh_token || !fileName) {
        return res.status(400).json({ error: "MISSING_PARAMS" });
    }

    try {
        // Кодируем путь, чтобы Super Mario World (USA).cht не ломал URL
        const cheatPath = `SNES/cheats/${fileName}`;
        const targetUrl = `${process.env.CLOUD_URL}/load?path=${encodeURIComponent(cheatPath)}&token=${encodeURIComponent(refresh_token)}`;
        
        const cloudRes = await fetch(targetUrl);
        
        if (!cloudRes.ok) {
            console.error(`CLOUD_ERROR: ${cloudRes.status} for ${fileName}`);
            return res.status(cloudRes.status).json({ error: "CLOUD_FILE_NOT_FOUND" });
        }
        
        const rawText = await cloudRes.text();
        if (!rawText) return res.status(200).send("cheats = 0");

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
                // RetroArch SNES9x понимает форматы: 7E0Dbe63 или 7E0Dbe+63
                // Убираем '=', заменяем на '+' для надежности
                current.code = line.replace('code:', '').trim().replace('=', '+');
            }
        });
        if (current) cheats.push(current);

        let output = [`cheats = ${cheats.length}`];
        cheats.forEach((c, i) => {
            output.push(`cheat${i}_desc = "${c.name || 'Cheat ' + i}"`);
            output.push(`cheat${i}_code = "${c.code}"`);
            output.push(`cheat${i}_enable = ${c.enable}`);
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(output.join('\n'));

    } catch (e) {
        console.error("CRITICAL_CONVERSION_ERROR:", e.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", details: e.message });
    }
}
