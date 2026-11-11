import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const CLOUD_BACKEND_ORIGIN =
  'https://ais-pre-4zg7ocif6w5h6imjdcw2y2-132176937111.asia-east1.run.app';

if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${CLOUD_BACKEND_ORIGIN}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(<App />);

