import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BinanceFuturesDashboard from './pages/BinanceFuturesDashboard';
import FuturesDashboard from './pages/FuturesDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/binance" replace />} />
        <Route path="/binance" element={<BinanceFuturesDashboard />} />
        <Route path="/futures" element={<FuturesDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
