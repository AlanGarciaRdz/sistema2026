import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  DollarSign,
  Receipt,
  User,
  Truck,
  Calendar,
  CreditCard,
  Wrench,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clientes', icon: Users },
    { path: '/quotes', label: 'Cotizaciones', icon: FileText },
    { path: '/contracts', label: 'Contratos', icon: FileCheck },
    { path: '/payments', label: 'Ingresos', icon: DollarSign },
    { path: '/expenses', label: 'Egresos', icon: Receipt },
    { path: '/drivers', label: 'Personal', icon: User },
    { path: '/vehicles', label: 'Vehículos', icon: Truck },
    { path: '/maintenance', label: 'Mantenimiento', icon: Wrench },
    { path: '/assignments', label: 'Asignaciones', icon: Calendar },
    { path: '/trips', label: 'Viajes', icon: Calendar },
    { path: '/payment-accounts', label: 'Cuentas de Pago', icon: CreditCard },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Floating button to show sidebar when collapsed (desktop only) */}
      {isCollapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
          title="Mostrar menú"
        >
          <PanelLeft size={24} />
        </button>
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-800 text-white transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          isCollapsed ? 'lg:w-0 lg:overflow-hidden' : 'w-64'
        }`}
      >
        <div className="p-6 w-64">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Sistema RK</h1>
            {/* Desktop: collapse/expand button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-2 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                title={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
              >
                {isCollapsed ? (
                  <PanelLeft size={22} />
                ) : (
                  <PanelLeftClose size={22} />
                )}
              </button>
            )}
          </div>
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-10 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
            >
              <LogOut size={20} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
