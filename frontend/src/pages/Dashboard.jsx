import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDashboardData } from '../services/api';
import { getMonthToDateRange } from '../utils/formatDateLocal';
import Header from '../components/Header';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import AccountsBusinessUnitStackedBar from '../components/AccountsBusinessUnitStackedBar';
import ExpensesByTypePieChart from '../components/ExpensesByTypePieChart';
import { Users, DollarSign, Receipt, CreditCard, Landmark, Wallet, Bus, BadgePercent, TrendingUp, Building2 } from 'lucide-react';

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
        } else {
          const { start: ms, end: me } = getMonthToDateRange();
          params.metricStart = ms;
          params.metricEnd = me;
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
  const accountsByBank = data?.accountsByBank || [];
  const expensesByType = data?.expensesByType || [];

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
  const revenueLabel = hasDateRange ? 'Ingresos (periodo)' : 'Ingresos (mes hasta hoy)';
  const expensesLabel = hasDateRange ? 'Egresos (periodo)' : 'Egresos (mes hasta hoy)';
  const accountsSubtitle = hasDateRange
    ? `${dateStart} a ${dateEnd}`
    : 'Todo el tiempo';

  const totalTrips = metrics.totalTrips ?? 0;
  const estimatedAvgTicket = metrics.estimatedAvgTicket ?? 0;
  const grossMargin = metrics.grossMargin ?? 0;
  const periodContractExpenses = metrics.periodContractExpenses ?? 0;
  const operatingMarginExpenses = metrics.operatingMarginExpenses ?? 0;
  const tripsCardLabel = hasDateRange ? 'Viajes totales (periodo)' : 'Viajes totales (mes hasta hoy)';
  const ticketCardLabel = hasDateRange
    ? 'Ticket promedio por valor de contrato (periodo)'
    : 'Ticket promedio por valor de contrato (mes hasta hoy)';
  const grossMarginLabel = hasDateRange ? 'Margen bruto (periodo)' : 'Margen bruto (mes hasta hoy)';
  const operatingMarginLabel = hasDateRange ? 'Margen operativo (periodo)' : 'Margen operativo (mes hasta hoy)';
  const expensesChartPeriodLabel = hasDateRange
    ? `Período: ${dateStart} a ${dateEnd}`
    : 'Mes calendario hasta hoy (misma base que la tarjeta de egresos)';

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
          <strong>Sin fechas:</strong> ingresos y egresos son del <strong>mes calendario hasta hoy</strong> (día
          1 del mes actual hasta la fecha de hoy en tu equipo). Total clientes y por cobrar son valores
          actuales. Los saldos por banco / unidad de negocio son <strong>todo el tiempo</strong>.
          <br />
          <strong className="mt-1 inline-block">
            Con inicio y fin en la barra:
          </strong>{' '}
          ingresos, egresos y saldos por cuenta se calculan solo en ese período.
          <br />
          <strong className="mt-1 inline-block">Viajes y ticket:</strong> los viajes cuentan contratos con fecha de
          inicio en el período; el ticket promedio usa el <strong>monto del contrato</strong> (campo total), no solo lo
          cobrado.
          <br />
          <strong className="mt-1 inline-block">Margen bruto:</strong> por cada viaje del período, valor del contrato
          menos egresos ligados a ese contrato; se suma el resultado de todos.
          <br />
          <strong className="mt-1 inline-block">Margen operativo:</strong> por ahora, suma de egresos del período{' '}
          <strong>sin contrato</strong> (gastos generales / overhead).
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Por cobrar</p>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">
                {formatCurrency(metrics.totalDueToCollect)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Suma de contratos en estado &ldquo;Por cobrar&rdquo;</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <Wallet className="text-amber-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Viajes y ticket (mismo período que ingresos) — fila debajo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-600 mb-1">{tripsCardLabel}</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{totalTrips}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                Contratos con fecha de inicio en el período (independiente de cobros).
              </p>
            </div>
            <div className="bg-teal-100 p-3 rounded-lg shrink-0">
              <Bus className="text-teal-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-600 mb-1">{ticketCardLabel}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {totalTrips > 0 ? formatCurrency(estimatedAvgTicket) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                {totalTrips > 0
                  ? `${formatCurrency(metrics.periodContractsValue ?? 0)} valor contratado ÷ ${totalTrips} viajes`
                  : 'Sin contratos con fecha de inicio en el período; no se puede calcular.'}
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg shrink-0">
              <BadgePercent className="text-indigo-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-600 mb-1">{grossMarginLabel}</p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  grossMargin >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {totalTrips > 0 ? formatCurrency(grossMargin) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                {totalTrips > 0
                  ? `${formatCurrency(metrics.periodContractsValue ?? 0)} contratado − ${formatCurrency(periodContractExpenses)} egresos de viaje`
                  : 'Sin viajes con inicio en el período.'}
              </p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg shrink-0">
              <TrendingUp className="text-emerald-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-600 mb-1">{operatingMarginLabel}</p>
              <p className="text-2xl font-bold text-orange-700 tabular-nums">
                {formatCurrency(operatingMarginExpenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                Egresos del período sin contrato asignado (excluye transferencias entre cuentas).
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg shrink-0">
              <Building2 className="text-orange-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      <ExpensesByTypePieChart
        expensesByType={expensesByType}
        formatCurrency={formatCurrency}
        periodLabel={expensesChartPeriodLabel}
      />

      {/* Saldo agrupado por banco / institución */}
      {accountsByBank.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Saldo por grupo (banco)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Suma de todas las cuentas activas con el mismo banco. {accountsSubtitle}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accountsByBank.map((group) => (
              <div
                key={group.bankName}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                      <Landmark className="text-blue-600" size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 leading-tight truncate" title={group.bankName}>
                        {group.bankName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {group.accountCount} cuenta{group.accountCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    group.totalBalance >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(group.totalBalance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cuentas por Unidad de Negocio */}
      {accountsByBusinessUnit.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Cuentas por Unidad de Negocio</h2>
          <p className="text-sm text-gray-500 mb-4">{accountsSubtitle}</p>
          <AccountsBusinessUnitStackedBar
            accountsByBusinessUnit={accountsByBusinessUnit}
            formatCurrency={formatCurrency}
          />
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
                        contract.status === 'Cotización enviada' ? 'bg-sky-100 text-sky-900' :
                        contract.status === 'Orden de compra' ? 'bg-indigo-100 text-indigo-900' :
                        contract.status === 'Factura enviada' ? 'bg-teal-100 text-teal-900' :
                        contract.status === 'Agendado' ? 'bg-green-100 text-green-800' :
                        contract.status === 'Realizado' ? 'bg-blue-100 text-blue-800' :
                        contract.status === 'Por cobrar' ? 'bg-amber-100 text-amber-900' :
                        contract.status === 'Por pagar' ? 'bg-orange-100 text-orange-900' :
                        contract.status === 'En proceso' ? 'bg-yellow-100 text-yellow-900' :
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
