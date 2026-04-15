import { useState, useEffect, useMemo } from 'react';
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

type WidgetId = 'weather' | 'news' | 'tasks';

const DEFAULT_WIDGETS: WidgetId[] = ['weather', 'news', 'tasks'];

const parseStoredWidgets = (): WidgetId[] => {
  const saved = localStorage.getItem('widgetOrder');

  if (!saved) {
    return DEFAULT_WIDGETS;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return DEFAULT_WIDGETS;
    }

    const filtered = parsed.filter((id): id is WidgetId => DEFAULT_WIDGETS.includes(id));
    const missing = DEFAULT_WIDGETS.filter((id) => !filtered.includes(id));
    return [...filtered, ...missing];
  } catch (_error) {
    return DEFAULT_WIDGETS;
  }
};

const App = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const [todos, setTodos] = useState<{ id: number; text: string }[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [backgroundUrl, setBackgroundUrl] = useState<string>(() => localStorage.getItem('backgroundUrl') || '');
  const [backgroundInput, setBackgroundInput] = useState<string>(() => localStorage.getItem('backgroundUrl') || '');
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(parseStoredWidgets);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);

  const [todoInput, setTodoInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLabel, setWeatherLabel] = useState('Local Weather');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('widgetOrder', JSON.stringify(widgetOrder));
  }, [isDarkMode, todos, widgetOrder]);

  useEffect(() => {
    localStorage.setItem('backgroundUrl', backgroundUrl);
  }, [backgroundUrl]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsRes = await fetch('/api/news?country=us');

        if (!newsRes.ok) {
          throw new Error(`HTTP error! status: ${newsRes.status}`);
        }

        const nData = await newsRes.json();

        if (nData && nData.articles) {
          setNews(nData.articles.slice(0, 5));
        }
      } catch (err) {
        console.error('News failed to sync:', err);
      }
    };

    const fetchWeather = async (query: string, label: string) => {
      try {
        const weatherRes = await fetch(`/api/weather?${query}`);

        if (!weatherRes.ok) {
          throw new Error(`HTTP error! status: ${weatherRes.status}`);
        }

        const wData = await weatherRes.json();

        if (wData && wData.main) {
          setWeather({
            temp: Math.round(wData.main.temp),
            description: wData.weather[0].description,
            city: wData.name
          });
          setWeatherLabel(label);
        }
      } catch (err) {
        console.error('Weather failed to sync:', err);
      }
    };

    fetchNews();

    if (!navigator.geolocation) {
      fetchWeather('city=Detroit', 'Local Weather (Default City)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({
          lat: String(coords.latitude),
          lon: String(coords.longitude)
        });
        fetchWeather(params.toString(), 'Local Weather (Current Location)');
      },
      () => {
        fetchWeather('city=Detroit', 'Local Weather (Default City)');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const filteredNews = useMemo(() => {
    return news.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [news, searchQuery]);

  const swapWidgets = (source: WidgetId, target: WidgetId) => {
    if (source === target) {
      return;
    }

    setWidgetOrder((prev) => {
      const sourceIndex = prev.indexOf(source);
      const targetIndex = prev.indexOf(target);

      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }

      const next = [...prev];
      next[sourceIndex] = target;
      next[targetIndex] = source;
      return next;
    });
  };

  const appStyle = backgroundUrl.trim()
    ? {
      backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.25)), url(${backgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }
    : undefined;

  const renderWidget = (widgetId: WidgetId) => {
    if (widgetId === 'weather') {
      return (
        <section className="weather-card widget-content">
          <div className="weather-info">
            <span className="label">{weatherLabel}</span>
            <h2>{weather?.city || 'Loading...'}</h2>
            <p>{weather?.description || '---'}</p>
          </div>
          <div className="weather-temp">{weather ? `${weather.temp}°F` : '--'}</div>
        </section>
      );
    }

    if (widgetId === 'news') {
      return (
        <section className="news-card widget-content">
          <div className="card-header">
            <h2>📰 Top Stories</h2>
          </div>
          <div className="news-list">
            {filteredNews.map((art, i) => (
              <a key={i} href={art.url} className="news-item" target="_blank" rel="noreferrer">
                <small>{art.source.name}</small>
                <p>{art.title}</p>
              </a>
            ))}
          </div>
        </section>
      );
    }

    return (
      <aside className="todo-sidebar widget-content">
        <div className="card-header">
          <h2>✅ Tasks</h2>
        </div>
        <form
          className="todo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!todoInput.trim()) return;
            setTodos([...todos, { id: Date.now(), text: todoInput }]);
            setTodoInput('');
          }}
        >
          <input
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            placeholder="New task..."
          />
          <button type="submit">+</button>
        </form>
        <ul className="todo-list">
          {todos.map((t) => (
            <li key={t.id}>
              <span>{t.text}</span>
              <button onClick={() => setTodos(todos.filter((x) => x.id !== t.id))}>×</button>
            </li>
          ))}
        </ul>
      </aside>
    );
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`} style={appStyle}>
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
          <form
            className="background-form"
            onSubmit={(e) => {
              e.preventDefault();
              setBackgroundUrl(backgroundInput.trim());
            }}
          >
            <input
              type="url"
              placeholder="Background image URL"
              value={backgroundInput}
              onChange={(e) => setBackgroundInput(e.target.value)}
            />
            <button type="submit">Set</button>
            <button
              type="button"
              onClick={() => {
                setBackgroundInput('');
                setBackgroundUrl('');
              }}
            >
              Clear
            </button>
          </form>
          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="widgets-grid">
        {widgetOrder.map((widgetId) => (
          <article
            key={widgetId}
            className={`widget-shell ${draggedWidget === widgetId ? 'dragging' : ''}`}
            draggable
            onDragStart={() => setDraggedWidget(widgetId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedWidget) {
                swapWidgets(draggedWidget, widgetId);
              }
              setDraggedWidget(null);
            }}
            onDragEnd={() => setDraggedWidget(null)}
          >
            <div className="widget-handle">Drag</div>
            {renderWidget(widgetId)}
          </article>
        ))}
      </main>
    </div>
  );
};

export default App;
