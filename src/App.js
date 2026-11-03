import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { getBodyParts, listExercises } from './api';
import ExerciseCard from './components/ExerciseCard';
import ExerciseDetail from './components/ExerciseDetail';
import { hrefFor } from './links';

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get('q') || '', part: p.get('part') || '', id: p.get('id') || '' };
}

function writeUrl(state, { push = false } = {}) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.part) p.set('part', state.part);
  if (state.id) p.set('id', state.id);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  if (push) window.history.pushState({ inApp: true }, '', url);
  else window.history.replaceState(window.history.state, '', url);
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function App() {
  const initial = readUrl();
  const [input, setInput] = useState(initial.q);
  const [part, setPart] = useState(initial.part);
  const [openId, setOpenId] = useState(initial.id);
  const query = useDebounced(input, 300);

  const [bodyParts, setBodyParts] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const abortRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getBodyParts(ctrl.signal).then(setBodyParts).catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const onPop = () => {
      const s = readUrl();
      setInput(s.q);
      setPart(s.part);
      setOpenId(s.id);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!openId) writeUrl({ q: query.trim(), part, id: '' });
  }, [query, part, openId]);

  const load = useCallback(
    async (offset) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus(offset === 0 ? 'loading' : 'more');
      setError('');
      try {
        const res = await listExercises({ query, bodyPart: part, offset, signal: ctrl.signal });
        setItems((prev) => {
          if (offset === 0) return res.items;
          const seen = new Set(prev.map((e) => e.id));
          return [...prev, ...res.items.filter((e) => !seen.has(e.id))];
        });
        setTotal(res.total);
        setHasMore(res.hasMore);
        setStatus('ready');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Something went wrong.');
        setStatus('error');
      }
    },
    [query, part]
  );

  useEffect(() => {
    load(0);
  }, [load, retryKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const openExercise = (id) => {
    writeUrl({ q: query.trim(), part, id }, { push: true });
    setOpenId(id);
    window.scrollTo(0, 0);
  };

  const closeExercise = () => {
    if (window.history.state?.inApp) {
      window.history.back();
    } else {
      writeUrl({ q: query.trim(), part, id: '' }, { push: true });
      setOpenId('');
    }
  };

  const pickPart = (name) => {
    setPart((cur) => (cur === name ? '' : name));
    if (openId) {
      setOpenId('');
      writeUrl({ q: query.trim(), part: name, id: '' }, { push: true });
    }
  };

  const goHome = (e) => {
    e.preventDefault();
    setInput('');
    setPart('');
    setOpenId('');
    writeUrl({}, { push: true });
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="wrap masthead-row">
          <a href="./" className="wordmark" onClick={goHome}>
            Lift<span>ictionary</span>
          </a>
          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="search" className="visually-hidden">
              Search exercises
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search 1,500 exercises, like romanian deadlift"
              value={input}
              autoComplete="off"
              onChange={(e) => {
                setInput(e.target.value);
                if (openId) {
                  setOpenId('');
                }
              }}
            />
          </form>
        </div>
        <nav className="wrap parts" aria-label="Filter by body part">
          {bodyParts.map((name) => (
            <button
              key={name}
              type="button"
              className="part"
              aria-pressed={part === name}
              onClick={() => pickPart(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      <main className="wrap">
        {openId ? (
          <ExerciseDetail id={openId} onBack={closeExercise} onOpen={openExercise} onPart={pickPart} />
        ) : (
          <>
            <div className="results-head">
              <h1 className={part || query.trim() ? 'is-term' : undefined}>
                {part || query.trim() ? resultTitle(query.trim(), part) : 'Look up any lift.'}
              </h1>
              <p className="count" aria-live="polite">
                {status === 'ready' && total != null && `${total.toLocaleString()} ${total === 1 ? 'entry' : 'entries'}`}
              </p>
            </div>

            {status === 'error' && (
              <div className="notice" role="alert">
                <p>{error}</p>
                <button type="button" className="btn" onClick={() => setRetryKey((k) => k + 1)}>
                  Try again
                </button>
              </div>
            )}

            {status === 'loading' && <SkeletonGrid />}

            {status !== 'loading' && status !== 'error' && items.length === 0 && (
              <div className="notice">
                <p>No exercises match that. Try a shorter word or clear the body part filter.</p>
              </div>
            )}

            {items.length > 0 && status !== 'loading' && (
              <ul className="grid">
                {items.map((ex) => (
                  <li key={ex.id}>
                    <ExerciseCard exercise={ex} href={hrefFor(ex.id)} onOpen={openExercise} />
                  </li>
                ))}
              </ul>
            )}

            {hasMore && status !== 'loading' && status !== 'error' && (
              <div className="more">
                <button type="button" className="btn" disabled={status === 'more'} onClick={() => load(items.length)}>
                  {status === 'more' ? 'Loading' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="wrap footer">
        <p>
          Exercise data and GIFs from{' '}
          <a href="https://github.com/ExerciseDB/exercisedb-api" target="_blank" rel="noreferrer">
            ExerciseDB
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

function resultTitle(q, part) {
  if (q && part) return `“${q}” in ${part}`;
  if (q) return `“${q}”`;
  return part;
}

function SkeletonGrid() {
  return (
    <ul className="grid" aria-label="Loading exercises">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="card skeleton" aria-hidden="true">
          <div className="card-media" />
          <div className="card-body">
            <span className="bar" />
            <span className="bar short" />
          </div>
        </li>
      ))}
    </ul>
  );
}
