// /api/cheats/load.js
export default async function handler(req, res) {
    const { refresh_token, fileName } = req.query;
    if (!refresh_token || !fileName) return res.status(400).send("MISSING_PARAMS");

    try {
        // 1. Качаем оригинальный файл читов (в твоем формате Snes9x EX+)
        // Предполагаем, что путь: SNES/cheats/zelda.cht (но внутри твой формат)
        const cheatPath = `SNES/cheats/${fileName}`;
        const cloudRes = await fetch(`${process.env.CLOUD_URL}/load?path=${encodeURIComponent(cheatPath)}&token=${refresh_token}`);
        
        if (!cloudRes.ok) return res.status(404).send("NO_CHEATS_FOUND");
        
        const rawText = await cloudRes.text();

        // 2. Парсинг твоего формата (Snes9x EX+) в RetroArch (.cht)
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
        let cheats = [];
        let current = null;

        lines.forEach(line => {
            if (line === 'cheat') {
                if (current) cheats.push(current);
                current = { enable: true };
            } else if (line.startsWith('name:')) {
                current.name = line.replace('name:', '').trim();
            } else if (line.startsWith('code:')) {
                // Убираем '=', так как RetroArch часто предпочитает слитный формат
                current.code = line.replace('code:', '').trim().replace('=', '');
            }
        });
        if (current) cheats.push(current);

        // 3. Сборка в формат .cht для RetroArch
        let output = [`cheats = ${cheats.length}`];
        cheats.forEach((c, i) => {
            output.push(`cheat${i}_desc = "${c.name || 'Cheat ' + i}"`);
            output.push(`cheat${i}_code = "${c.code}"`);
            output.push(`cheat${i}_enable = ${c.enable}`);
        });

        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(output.join('\n'));

    } catch (e) {
        res.status(500).send("CONVERSION_ERROR");
    }
}
  
