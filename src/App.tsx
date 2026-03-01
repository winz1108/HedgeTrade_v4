import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BinanceFuturesDashboard from './pages/BinanceFuturesDashboard';
import FuturesDashboard from './pages/FuturesDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BinanceFuturesDashboard />} />
        <Route path="/futures" element={<FuturesDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
