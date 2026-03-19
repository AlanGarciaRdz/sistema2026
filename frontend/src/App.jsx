import React, { useState } from 'react';
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
import Trips from './pages/Trips';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router basename="/sistema">
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((c) => !c)}
        />
        <main
          className={`flex-1 transition-all duration-300 pt-4 ${
            isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'
          }`}
        >
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
              <Route path="/trips" element={<Trips />} />
              <Route path="/payment-accounts" element={<PaymentAccounts />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
