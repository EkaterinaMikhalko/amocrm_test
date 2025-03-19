import express from 'express';
import fetch from 'node-fetch'; // Убедитесь, что node-fetch установлен

const app = express();
const port = 3000;

// Разрешаем CORS для всех запросов
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Middleware для обработки JSON-тела запроса
app.use(express.json());

// Прокси для запросов к amoCRM
app.post('/proxy/oauth2/access_token', async (req, res) => {
    try {
        console.log('Получен запрос:', req.body);

        const response = await fetch('https://kattie.amocrm.ru/oauth2/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'b4077d06-4684-40c3-8b21-dee9b1c58aa7',
                client_secret: 'https://ekaterinamikhalko.github.io/callback/secret', 
                grant_type: 'authorization_code',
                code: req.body.code,
                redirect_uri: 'https://ekaterinamikhalko.github.io/callback' 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка от amoCRM:', errorData);
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Токены получены:', data);

        res.json(data);
    } catch (error) {
        console.error('Ошибка прокси:', error);
        res.status(500).json({ error: 'Ошибка прокси', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Прокси-сервер запущен на http://localhost:${port}`);
});