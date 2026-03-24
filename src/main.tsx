import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import FuturesDashboard from './pages/FuturesDashboard.tsx';
import ProfessionalDashboard from './pages/ProfessionalDashboard.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/futures" element={<FuturesDashboard />} />
        <Route path="/futures/professional" element={<ProfessionalDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
