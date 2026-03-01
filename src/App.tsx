import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FuturesDashboard from './pages/FuturesDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FuturesDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
