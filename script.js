document.addEventListener('DOMContentLoaded', function() {
    const dealsTableBody = document.querySelector('#dealsTable tbody');
    const accessToken = `xy5IUF7GXKKe0pTQq5z1Mz5vRK7dgcIyjLNsEjKQkjXz9t9L6Q8T7QKFv1JCpW0u`;

    if (accessToken) {
        console.log('Токен получен:', accessToken);
        // Используйте токен для запросов к API amoCRM
    } else {
        console.log('Токен отсутствует. Необходима авторизация.');
    }
    // Обработка ошибок авторизации
    window.handleAuthError = function(error) {
        console.error('Ошибка авторизации:', error);
    };

    // Функция для получения токена из URL (после авторизации)
    function getAccessTokenFromUrl() {
        const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        return urlParams.get('access_token');
    }

    // Проверка наличия токена и инициализация загрузки данных
    function init() {
        accessToken = getAccessTokenFromUrl();
        if (accessToken) {
            fetchDealsAndContacts();
        } else {
            console.log('Токен отсутствует. Необходима авторизация.');
        }
    }

    // Функция для получения данных о сделках и контактах
    async function fetchDealsAndContacts() {
        try {
            const dealsResponse = await fetch('https://kattie.amocrm.ru/api/v4/leads', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const dealsData = await dealsResponse.json();

            for (const deal of dealsData._embedded.leads) {
                const contactResponse = await fetch(`https://kattie.amocrm.ru/api/v4/contacts/${deal.contact_id}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const contactData = await contactResponse.json();

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

    // Функция для раскрытия деталей сделки
    async function expandDealDetails(dealId, row) {
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading';
        row.innerHTML = '';
        row.appendChild(loadingSpinner);

        try {
            const dealDetailsResponse = await fetch(`https://kattie.amocrm.ru/api/v4/leads/${dealId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const dealDetails = await dealDetailsResponse.json();

            const taskResponse = await fetch(`https://kattie.amocrm.ru/api/v4/tasks?filter[entity_id]=${dealId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
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

    // Инициализация при загрузке страницы
    init();
});