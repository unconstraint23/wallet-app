import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Home from './pages/Home';
import Header from './components/Header';

function App() {
  return (
    <WalletProvider>
      <Router>
        <Header />
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
