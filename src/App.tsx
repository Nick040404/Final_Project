import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

interface NewsArticle {
  title: string;
  url: string;
  source: { name: string };
}

interface WeatherData {
  temp: number;
  description: string;
  city: string;
}

const App = () => {
  // --- State ---
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  
  const [todos, setTodos] = useState<{ id: number; text: string }[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [todoInput, setTodoInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // --- Requirement 3: Active Clock + Cleanup ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Requirement 2: Persistence ---
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [isDarkMode, todos]);

 // --- Requirement 1: Dual API Fetch (Vite & Netlify Compatible) ---
  useEffect(() => {
    const fetchData = async () => {
      // Accessing variables via import.meta.env for Vite/Netlify
      const WEATHER_KEY = import.meta.env.VITE_OPEN_WEATHER_API;
      const NEWS_KEY = import.meta.env.VITE_NEWS_API;

      try {
        const [weatherRes, newsRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&units=metric&appid=${WEATHER_KEY}`),
          fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_KEY}`)
        ]);

        // Safety check: ensure both requests were successful
        if (!weatherRes.ok || !newsRes.ok) {
          throw new Error(`HTTP error! status: ${weatherRes.status} or ${newsRes.status}`);
        }

        const wData = await weatherRes.json();
        const nData = await newsRes.json();

        // Update Weather State
        if (wData && wData.main) {
          setWeather({ 
            temp: Math.round(wData.main.temp), 
            description: wData.weather[0].description, 
            city: wData.name 
          });
        }

        // Update News State
        if (nData && nData.articles) {
          setNews(nData.articles.slice(0, 5));
        }

      } catch (err) {
        console.error("Dashboard failed to sync:", err);
      }
    };

    fetchData();
  }, []);

  // --- Requirement 4: Global Search ---
  const filteredNews = useMemo(() => {
    return news.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [news, searchQuery]);

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <header className="main-header">
        <div className="header-left">
          <h1>Command Center</h1>
          <div className="clock-display">🕒 {currentTime.toLocaleTimeString()}</div>
        </div>

        <div className="header-right">
          <div className="search-wrapper">
            <input 
              type="text" 
              placeholder="Search news..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <div className="main-content">
          <section className="weather-card">
            <div className="weather-info">
              <span className="label">Local Weather</span>
              <h2>{weather?.city || 'Loading...'}</h2>
              <p>{weather?.description || '---'}</p>
            </div>
            <div className="weather-temp">
              {weather ? `${weather.temp}°C` : '--'}
            </div>
          </section>

          <section className="news-card">
            <div className="card-header">
              <h2>📰 Top Stories</h2>
            </div>
            <div className="news-list">
              {filteredNews.map((art, i) => (
                <a key={i} href={art.url} className="news-item">
                  <small>{art.source.name}</small>
                  <p>{art.title}</p>
                </a>
              ))}
            </div>
          </section>
        </div>

        <aside className="todo-sidebar">
          <div className="card-header">
            <h2>✅ Tasks</h2>
          </div>
          <form className="todo-form" onSubmit={(e) => {
            e.preventDefault();
            if (!todoInput.trim()) return;
            setTodos([...todos, { id: Date.now(), text: todoInput }]);
            setTodoInput('');
          }}>
            <input 
              value={todoInput} 
              onChange={(e) => setTodoInput(e.target.value)} 
              placeholder="New task..." 
            />
            <button type="submit">+</button>
          </form>
          <ul className="todo-list">
            {todos.map(t => (
              <li key={t.id}>
                <span>{t.text}</span>
                <button onClick={() => setTodos(todos.filter(x => x.id !== t.id))}>×</button>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
};

export default App;