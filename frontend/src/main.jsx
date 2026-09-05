import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { HealthProvider } from './hooks/useHealth.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <HealthProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HealthProvider>
    </BrowserRouter>
  </StrictMode>,
);
