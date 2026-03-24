import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDashboardData } from '../services/api';
import Header from '../components/Header';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { Users, FileCheck, FileText, DollarSign, Receipt, CreditCard } from 'lucide-react';

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const dateStart = searchParams.get('start') || '';
  const dateEnd = searchParams.get('end') || '';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const params = {};
        if (dateStart && dateEnd) {
          params.start = dateStart;
          params.end = dateEnd;
        }
        const response = await getDashboardData(params);
        if (!cancelled) setData(response.data.data);
      } catch (error) {
        if (!cancelled) {
          setToast({
            message: 'Error al cargar los datos del dashboard',
            type: 'error'
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [dateStart, dateEnd]);

  const handleDateChange = (start, end) => {
    const next = new URLSearchParams(searchParams);
    if (start) next.set('start', start); else next.delete('start');
    if (end) next.set('end', end); else next.delete('end');
    setSearchParams(next, { replace: true });
  };

  if (loading) return <Loading />;

  const metrics = data?.metrics || {};
  const recentContracts = data?.recentContracts || [];
  const upcomingAssignments = data?.upcomingAssignments || [];
  const accountsByBusinessUnit = data?.accountsByBusinessUnit || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const hasDateRange = dateStart && dateEnd;
  const revenueLabel = hasDateRange ? 'Ingresos (periodo)' : 'Ingresos del Mes';
  const expensesLabel = hasDateRange ? 'Egresos (periodo)' : 'Egresos del Mes';
  const accountsSubtitle = hasDateRange
    ? `${dateStart} a ${dateEnd}`
    : 'Todo el tiempo';

  return (
    <div className="p-6">
      <Header title="Dashboard" />

      {/* Filtro de fechas */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Período (opcional)</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => handleDateChange(e.target.value, dateEnd)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha fin</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => handleDateChange(dateStart, e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {(dateStart || dateEnd) && (
            <button
              type="button"
              onClick={() => handleDateChange('', '')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Limpiar
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Sin fechas: ingresos/egresos = mes actual, cuentas = todo el tiempo. Con fechas: todo filtrado al período.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalClients}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Contratos Activos</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeContracts}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FileCheck className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cotizaciones Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.pendingQuotes}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{revenueLabel}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.currentMonthRevenue)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{expensesLabel}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.currentMonthExpenses)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Receipt className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>
      {/* Cuentas por Unidad de Negocio */}
      {accountsByBusinessUnit.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Cuentas por Unidad de Negocio</h2>
          <p className="text-sm text-gray-500 mb-4">{accountsSubtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountsByBusinessUnit.map((unit) => (
              <div key={unit.businessUnit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard size={20} className="text-gray-600" />
                    {unit.businessUnit}
                  </h3>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(unit.totalBalance)}</span>
                </div>
                <div className="p-4 divide-y divide-gray-100">
                  {unit.accounts.map((acc) => (
                    <div key={acc.id} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{acc.account_name}</p>
                        <p className="text-xs text-gray-500">{acc.bank_name || '-'}</p>
                      </div>
                      <span className={`font-semibold ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Contracts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Contratos Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha Inicio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentContracts.length > 0 ? (
                recentContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.contract_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(contract.start_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(contract.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        contract.status === 'Agendado' ? 'bg-green-100 text-green-800' :
                        contract.status === 'Realizado' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No hay contratos recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Próximas Asignaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contrato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Chofer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vehículo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(assignment.driving_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.contract_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.driver_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.vehicle_code || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No hay asignaciones próximas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
