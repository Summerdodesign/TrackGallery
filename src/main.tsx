import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Inject global styles for dark background
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    background: #121212;
    color: #eee;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 1024px) {
    body { font-size: 14px; }
  }
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
