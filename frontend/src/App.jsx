import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Quotes from './pages/Quotes';
import Contracts from './pages/Contracts';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Assignments from './pages/Assignments';
import PaymentAccounts from './pages/PaymentAccounts';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto max-w-7xl">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/payment-accounts" element={<PaymentAccounts />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
