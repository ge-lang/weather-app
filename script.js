   
        class WeatherApp {
            constructor() {
                this.apiKey = ''; // Free from OpenWeatherMap
                this.currentUnit = 'metric';
                this.recentSearches = JSON.parse(localStorage.getItem('weatherRecentSearches')) || [];
                this.init();
            }

            init() {
                this.setupEventListeners();
                this.renderRecentSearches();
                
                // Load weather for default city or use geolocation
                this.getWeatherByCity('Brussels');
            }

            setupEventListeners() {
                // Search functionality
                document.getElementById('searchBtn').addEventListener('click', () => {
                    this.handleSearch();
                });

                document.getElementById('searchInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleSearch();
                });

                // Location button
                document.getElementById('locationBtn').addEventListener('click', () => {
                    this.getLocationWeather();
                });

                // Unit toggle
                document.querySelectorAll('.unit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        this.currentUnit = e.target.dataset.unit;
                        if (this.currentCity) {
                            this.getWeatherByCity(this.currentCity);
                        }
                    });
                });
            }

            async handleSearch() {
                const city = document.getElementById('searchInput').value.trim();
                if (city) {
                    await this.getWeatherByCity(city);
                    this.addToRecentSearches(city);
                }
            }

            async getWeatherByCity(city) {
                this.showLoading(true);
                this.hideError();

                try {
                    // Current weather
                    const currentResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${this.currentUnit}&appid=${this.apiKey}`
                    );

                    if (!currentResponse.ok) throw new Error('City not found');

                    const currentData = await currentResponse.json();

                    // 5-day forecast
                    const forecastResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${this.currentUnit}&appid=${this.apiKey}`
                    );

                    const forecastData = await forecastResponse.json();

                    this.displayWeather(currentData, forecastData);
                    this.currentCity = city;

                } catch (error) {
                    this.showError();
                } finally {
                    this.showLoading(false);
                }
            }

            getLocationWeather() {
                if (!navigator.geolocation) {
                    alert('Geolocation is not supported by your browser');
                    return;
                }

                this.showLoading(true);

                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        
                        try {
                            const response = await fetch(
                                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${this.currentUnit}&appid=${this.apiKey}`
                            );
                            
                            const data = await response.json();
                            this.getWeatherByCity(data.name);
                            
                        } catch (error) {
                            this.showError();
                        }
                    },
                    (error) => {
                        this.showLoading(false);
                        alert('Unable to retrieve your location');
                    }
                );
            }

            displayWeather(currentData, forecastData) {
                this.updateCurrentWeather(currentData);
                this.updateForecast(forecastData);
                this.updateBackground(currentData.weather[0].main);
                
                document.getElementById('currentWeather').style.display = 'block';
                document.getElementById('forecastSection').style.display = 'block';
            }

            updateCurrentWeather(data) {
                document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
                document.getElementById('temperature').textContent = 
                    `${Math.round(data.main.temp)}°${this.currentUnit === 'metric' ? 'C' : 'F'}`;
                document.getElementById('weatherDescription').textContent = data.weather[0].description;
                document.getElementById('feelsLike').textContent = 
                    `${Math.round(data.main.feels_like)}°${this.currentUnit === 'metric' ? 'C' : 'F'}`;
                document.getElementById('humidity').textContent = `${data.main.humidity}%`;
                document.getElementById('windSpeed').textContent = 
                    `${data.wind.speed} ${this.currentUnit === 'metric' ? 'm/s' : 'mph'}`;
                document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

                // Weather icon
                const icon = this.getWeatherIcon(data.weather[0].main, data.weather[0].icon);
                document.getElementById('weatherIcon').textContent = icon;
            }

            updateForecast(data) {
                const forecastContainer = document.getElementById('forecastContainer');
                forecastContainer.innerHTML = '';

                // Get unique days (API returns 3-hour intervals, we need daily)
                const dailyForecasts = [];
                const processedDays = new Set();

                data.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const day = date.toLocaleDateString('en', { weekday: 'short' });
                    
                    if (!processedDays.has(day) && dailyForecasts.length < 5) {
                        processedDays.add(day);
                        dailyForecasts.push({
                            day: day,
                            temp: Math.round(item.main.temp),
                            description: item.weather[0].description,
                            icon: item.weather[0].icon,
                            main: item.weather[0].main
                        });
                    }
                });

                dailyForecasts.forEach(forecast => {
                    const forecastItem = document.createElement('div');
                    forecastItem.className = 'forecast-item';
                    forecastItem.innerHTML = `
                        <div class="forecast-day">${forecast.day}</div>
                        <div class="forecast-icon">${this.getWeatherIcon(forecast.main, forecast.icon)}</div>
                        <div class="forecast-temp">${forecast.temp}°${this.currentUnit === 'metric' ? 'C' : 'F'}</div>
                        <div class="forecast-description">${forecast.description}</div>
                    `;
                    forecastContainer.appendChild(forecastItem);
                });
            }

            getWeatherIcon(main, iconCode) {
                const isDay = iconCode.includes('d');
                const icons = {
                    'Clear': isDay ? '☀️' : '🌙',
                    'Clouds': isDay ? '⛅' : '☁️',
                    'Rain': '🌧️',
                    'Drizzle': '🌦️',
                    'Thunderstorm': '⛈️',
                    'Snow': '❄️',
                    'Mist': '🌫️',
                    'Fog': '🌫️'
                };
                return icons[main] || '🌈';
            }

            updateBackground(weatherMain) {
                document.body.className = 'default';
                
                const weatherClass = {
                    'Clear': 'sunny',
                    'Clouds': 'cloudy',
                    'Rain': 'rainy',
                    'Drizzle': 'rainy',
                    'Thunderstorm': 'rainy'
                }[weatherMain];

                if (weatherClass) {
                    // Check if it's night time
                    const now = new Date().getHours();
                    if ((now < 6 || now > 18) && weatherMain === 'Clear') {
                        document.body.className = 'night';
                    } else {
                        document.body.className = weatherClass;
                    }
                }
            }

            showLoading(show) {
                const searchText = document.getElementById('searchText');
                const loading = document.getElementById('searchLoading');
                const searchBtn = document.getElementById('searchBtn');

                if (show) {
                    searchText.style.display = 'none';
                    loading.style.display = 'inline-block';
                    searchBtn.disabled = true;
                } else {
                    searchText.style.display = 'inline';
                    loading.style.display = 'none';
                    searchBtn.disabled = false;
                }
            }

            showError() {
                document.getElementById('errorMessage').style.display = 'block';
            }

            hideError() {
                document.getElementById('errorMessage').style.display = 'none';
            }

            addToRecentSearches(city) {
                if (!this.recentSearches.includes(city)) {
                    this.recentSearches.unshift(city);
                    if (this.recentSearches.length > 5) {
                        this.recentSearches.pop();
                    }
                    localStorage.setItem('weatherRecentSearches', JSON.stringify(this.recentSearches));
                    this.renderRecentSearches();
                }
            }

            renderRecentSearches() {
                const container = document.getElementById('recentSearches');
                container.innerHTML = '';

                this.recentSearches.forEach(city => {
                    const cityElement = document.createElement('div');
                    cityElement.className = 'recent-city';
                    cityElement.textContent = city;
                    cityElement.addEventListener('click', () => {
                        document.getElementById('searchInput').value = city;
                        this.getWeatherByCity(city);
                    });
                    container.appendChild(cityElement);
                });
            }
        }

        // Для демонстрации используем mock API key
        // На практике нужно получить бесплатный ключ на openweathermap.org
        const weatherApp = new WeatherApp();

        // Mock data for demonstration (удалите в продакшене)
        weatherApp.apiKey = 'demo_key'; // Замените на реальный ключ

        // Если API ключ демо, используем mock данные
        if (weatherApp.apiKey === 'demo_key') {
            weatherApp.getWeatherByCity = async function(city) {
                this.showLoading(true);
                this.hideError();
                
                // Mock данные для демонстрации
                setTimeout(() => {
                    const mockCurrentData = {
                        name: city,
                        sys: { country: 'BE' },
                        main: {
                            temp: 15,
                            feels_like: 14,
                            humidity: 65,
                            pressure: 1013
                        },
                        weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
                        wind: { speed: 3.5 }
                    };

                    const mockForecastData = {
                        list: [
                            { dt: Date.now()/1000 + 86400, main: { temp: 16 }, weather: [{ main: 'Clouds', description: 'cloudy' }] },
                            { dt: Date.now()/1000 + 172800, main: { temp: 18 }, weather: [{ main: 'Clear', description: 'clear sky' }] },
                            { dt: Date.now()/1000 + 259200, main: { temp: 14 }, weather: [{ main: 'Rain', description: 'light rain' }] },
                            { dt: Date.now()/1000 + 345600, main: { temp: 17 }, weather: [{ main: 'Clouds', description: 'overcast' }] },
                            { dt: Date.now()/1000 + 432000, main: { temp: 19 }, weather: [{ main: 'Clear', description: 'sunny' }] }
                        ]
                    };

                    this.displayWeather(mockCurrentData, mockForecastData);
                    this.currentCity = city;
                    this.showLoading(false);
                }, 1000);
            };
        }
    
