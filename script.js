document.addEventListener('DOMContentLoaded', function() {
    const dealsTableBody = document.querySelector('#dealsTable tbody');
    let accessToken = null;
    let refreshToken = null;

    // Обработка ошибок авторизации
    window.handleAuthError = function(error) {
        console.error('Ошибка авторизации:', error);
    };

    // Функция для получения authorization code из URL
    function getAuthorizationCodeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            console.log('Authorization code получен из URL:', code);
            return code;
        } else {
            console.log('Authorization code отсутствует в URL.');
            return null;
        }
    }

    // Функция для обмена authorization code на токены через прокси
    async function exchangeCodeForTokens(code) {
        try {
            const response = await fetch('http://localhost:3000/proxy/oauth2/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: 'b4077d06-4684-40c3-8b21-dee9b1c58aa7',
                    client_secret: 'ваш_client_secret', // Замените на ваш client_secret
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: 'https://ekaterinamikhalko.github.io/callback' // Замените на ваш redirect_uri
                })
            });

            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('Токены получены:', data);

            accessToken = data.access_token;
            refreshToken = data.refresh_token;

            // Сохраняем токены (например, в localStorage)
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // Загружаем данные
            fetchDealsAndContacts();
        } catch (error) {
            console.error('Ошибка при обмене кода на токены:', error);
        }
    }

    // Инициализация при загрузке страницы
    function init() {
        const code = getAuthorizationCodeFromUrl();
        if (code) {
            exchangeCodeForTokens(code);
        } else {
            console.log('Authorization code отсутствует. Необходима авторизация.');
        }
    }

    // Функция для получения данных о сделках и контактах через прокси
    async function fetchDealsAndContacts() {
        try {
            console.log('Загрузка данных о сделках...');
            const dealsResponse = await fetch('http://localhost:3000/proxy/api/v4/leads', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (!dealsResponse.ok) {
                throw new Error(`Ошибка HTTP: ${dealsResponse.status}`);
            }
            const dealsData = await dealsResponse.json();
            console.log('Данные о сделках:', dealsData);

            if (!dealsData._embedded || !dealsData._embedded.leads) {
                throw new Error('Нет данных о сделках.');
            }

            for (const deal of dealsData._embedded.leads) {
                console.log('Загрузка данных о контакте для сделки:', deal.id);
                const contactResponse = await fetch(`http://localhost:3000/proxy/api/v4/contacts/${deal.contact_id}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                if (!contactResponse.ok) {
                    throw new Error(`Ошибка HTTP: ${contactResponse.status}`);
                }
                const contactData = await contactResponse.json();
                console.log('Данные о контакте:', contactData);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${deal.id}</td>
                    <td>${deal.name}</td>
                    <td>${deal.budget}</td>
                    <td>${contactData.name}</td>
                    <td>${contactData.phone}</td>
                `;

                row.addEventListener('click', () => expandDealDetails(deal.id, row));
                dealsTableBody.appendChild(row);

                // Ограничение на 2 запроса в секунду
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Ошибка при получении данных:', error);
        }
    }

    // Функция для раскрытия деталей сделки через прокси
    async function expandDealDetails(dealId, row) {
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading';
        row.innerHTML = '';
        row.appendChild(loadingSpinner);

        try {
            const dealDetailsResponse = await fetch(`http://localhost:3000/proxy/api/v4/leads/${dealId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (!dealDetailsResponse.ok) {
                throw new Error(`Ошибка HTTP: ${dealDetailsResponse.status}`);
            }
            const dealDetails = await dealDetailsResponse.json();

            const taskResponse = await fetch(`http://localhost:3000/proxy/api/v4/tasks?filter[entity_id]=${dealId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (!taskResponse.ok) {
                throw new Error(`Ошибка HTTP: ${taskResponse.status}`);
            }
            const taskData = await taskResponse.json();
            const nearestTask = taskData._embedded.tasks[0];

            let statusColor = 'red'; // По умолчанию красный
            if (nearestTask) {
                const taskDate = new Date(nearestTask.complete_till_at * 1000);
                const today = new Date();
                const diffTime = taskDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    statusColor = 'green';
                } else if (diffDays > 1) {
                    statusColor = 'yellow';
                }
            }

            row.innerHTML = `
                <td>${dealDetails.id}</td>
                <td>${dealDetails.name}</td>
                <td>${dealDetails.budget}</td>
                <td>${dealDetails.contact_name}</td>
                <td>${dealDetails.contact_phone}</td>
                <td>${new Date(dealDetails.created_at * 1000).toLocaleDateString('ru-RU')}</td>
                <td>
                    <svg width="20" height="20">
                        <circle cx="10" cy="10" r="8" fill="${statusColor}" />
                    </svg>
                </td>
            `;
        } catch (error) {
            console.error('Ошибка при получении деталей сделки:', error);
            row.innerHTML = 'Ошибка загрузки данных';
        }
    }

    // Обработчик для кнопки авторизации
    const authButton = document.querySelector('.amocrm_oauth');
    if (authButton) {
        authButton.addEventListener('click', function() {
            console.log('Кнопка авторизации нажата.');
            // После успешной авторизации и получения кода, загрузим данные
            init();
        });
    } else {
        console.error('Кнопка авторизации не найдена.');
    }

    // Автоматически вызываем init при загрузке страницы, если есть код авторизации
    init();
});