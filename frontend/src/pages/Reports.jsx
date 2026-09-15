import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUnitReport, getCompanyReport, getVehicles } from '../services/api';
import Header from '../components/Header';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import Table from '../components/Table';
import { formatDateLocal, getCalendarMonthRange } from '../utils/formatDateLocal';
import { generateUnitReportPdf } from '../utils/unitReportPdf';
import { generateCompanyReportPdf } from '../utils/companyReportPdf';
import {
  TrendingUp,
  TrendingDown,
  Bus,
  Wrench,
  FileCheck,
  Users,
  DollarSign,
  Receipt,
  CreditCard,
  FileDown,
  Building2,
  Landmark,
  BadgePercent
} from 'lucide-react';

const defaultRange = () => {
  const { start, end } = getCalendarMonthRange();
  return { start, end };
};

const formatCurrency = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = defaultRange();

  const dateStart = searchParams.get('start') || initial.start;
  const dateEnd = searchParams.get('end') || initial.end;
  const vehicleId = searchParams.get('vehicle') || '';
  const reportMode = searchParams.get('mode') === 'company' ? 'company' : 'unit';

  const [vehicles, setVehicles] = useState([]);
  const [report, setReport] = useState(null);
  const [companyReport, setCompanyReport] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingCompanyReport, setLoadingCompanyReport] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingVehicles(true);
        const res = await getVehicles();
        if (!cancelled) setVehicles(res.data.data || []);
      } catch {
        if (!cancelled) setToast({ message: 'Error al cargar unidades', type: 'error' });
      } finally {
        if (!cancelled) setLoadingVehicles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reportMode !== 'unit' || !vehicleId || !dateStart || !dateEnd) {
      setReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingReport(true);
        const res = await getUnitReport({
          start: dateStart,
          end: dateEnd,
          vehicle_id: vehicleId
        });
        if (!cancelled) setReport(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setToast({
            message: err.response?.data?.error || 'Error al generar el reporte',
            type: 'error'
          });
        }
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportMode, vehicleId, dateStart, dateEnd]);

  useEffect(() => {
    if (reportMode !== 'company' || !dateStart || !dateEnd) {
      setCompanyReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingCompanyReport(true);
        const res = await getCompanyReport({ start: dateStart, end: dateEnd });
        if (!cancelled) setCompanyReport(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setCompanyReport(null);
          setToast({
            message: err.response?.data?.error || 'Error al generar reporte empresa',
            type: 'error'
          });
        }
      } finally {
        if (!cancelled) setLoadingCompanyReport(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportMode, dateStart, dateEnd]);

  const vehicleOptions = vehicles.map((v) => ({
    id: String(v.id),
    label: `${v.vehicle_code || v.license_plate || 'Sin código'} · ${v.brand || ''} ${v.model || ''} (${v.license_plate || '—'})`.trim()
  }));

  const handleDownloadPdf = () => {
    if (reportMode === 'company') {
      if (!companyReport) return;
      try {
        setPdfGenerating(true);
        generateCompanyReportPdf(companyReport);
        setToast({ message: 'Reporte empresa descargado (PDF)', type: 'success' });
      } catch (err) {
        console.error(err);
        setToast({ message: 'No se pudo generar el PDF', type: 'error' });
      } finally {
        setPdfGenerating(false);
      }
      return;
    }
    if (!report) return;
    try {
      setPdfGenerating(true);
      generateUnitReportPdf(report);
      setToast({ message: 'Reporte descargado (PDF)', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'No se pudo generar el PDF', type: 'error' });
    } finally {
      setPdfGenerating(false);
    }
  };

  const setReportMode = (mode) => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'company') next.set('mode', 'company');
    else next.delete('mode');
    setSearchParams(next, { replace: true });
  };

  const summary = report?.summary;
  const companySummary = companyReport?.summary;
  const profitPositive = summary?.has_profit;

  const unitColumns = [
    {
      header: 'Fecha',
      width: '100px',
      render: (row) => formatDateLocal(row.start_date)
    },
    { header: 'No. contrato', accessor: 'contract_number', width: '120px' },
    { header: 'Cliente', accessor: 'client_name', wrap: true },
    {
      header: 'Ruta',
      wrap: true,
      render: (row) => `${row.origin || '—'} → ${row.destination || '—'}`
    },
    { header: 'Estado', accessor: 'status', width: '110px' },
    {
      header: 'Cotizado',
      render: (row) => (
        <span className="tabular-nums font-medium">{formatCurrency(row.quoted_amount)}</span>
      )
    }
  ];

  const maintenanceColumns = [
    {
      header: 'Fecha',
      width: '100px',
      render: (row) => formatDateLocal(row.maintenance_date)
    },
    { header: 'Tipo', accessor: 'maintenance_type', wrap: true },
    {
      header: 'Km',
      width: '90px',
      render: (row) =>
        row.mileage != null && row.mileage !== '' ? (
          <span className="tabular-nums">{Number(row.mileage).toLocaleString('es-MX')}</span>
        ) : (
          '—'
        )
    },
    {
      header: 'Costo',
      width: '110px',
      render: (row) => (
        <span className="tabular-nums font-medium">{formatCurrency(row.cost)}</span>
      )
    },
    {
      header: 'Notas',
      wrap: true,
      render: (row) => (
        <span className="text-xs text-gray-600 line-clamp-2">{row.notes || '—'}</span>
      )
    }
  ];

  const expenseColumns = [
    {
      header: 'Fecha',
      width: '100px',
      render: (row) => formatDateLocal(row.expense_date)
    },
    { header: 'Tipo', accessor: 'expense_type', width: '100px' },
    {
      header: 'Monto',
      width: '110px',
      render: (row) => (
        <span className="tabular-nums font-medium">{formatCurrency(row.amount)}</span>
      )
    },
    { header: 'Cuenta', accessor: 'account_name', wrap: true },
    { header: 'Unidad neg.', accessor: 'business_unit', wrap: true },
    {
      header: 'Notas',
      wrap: true,
      render: (row) => (
        <span className="text-xs text-gray-600 line-clamp-2">{row.notes || '—'}</span>
      )
    }
  ];

  const companyUnitColumns = [
    { header: 'Unidad', accessor: 'label', wrap: true },
    { header: 'Viajes', render: (r) => r.trips },
    { header: 'Ingresos', render: (r) => <span className="tabular-nums">{formatCurrency(r.income)}</span> },
    { header: 'Egresos', render: (r) => <span className="tabular-nums">{formatCurrency(r.expenses)}</span> },
    { header: 'Impuestos', render: (r) => <span className="tabular-nums">{formatCurrency(r.taxes)}</span> },
    { header: 'Por cobrar', render: (r) => <span className="tabular-nums">{formatCurrency(r.por_cobrar)}</span> },
    {
      header: 'Utilidad',
      render: (r) => (
        <span className={`tabular-nums font-medium ${r.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {formatCurrency(r.profit)}
        </span>
      )
    }
  ];

  if (loadingVehicles) return <Loading />;

  return (
    <div className="p-4 md:p-6 min-w-0">
      <Header title="Reportes" />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setReportMode('unit')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            reportMode === 'unit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Bus size={16} />
          Por unidad
        </button>
        <button
          type="button"
          onClick={() => setReportMode('company')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            reportMode === 'company'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Building2 size={16} />
          Empresa (mes)
        </button>
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {reportMode === 'company' ? 'Reporte general de empresa' : 'Reporte por unidad'}
        </p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${reportMode === 'unit' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3`}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setParam('start', e.target.value)}
              className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setParam('end', e.target.value)}
              className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 text-sm"
            />
          </div>
          {reportMode === 'unit' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
              <select
                value={vehicleId}
                onChange={(e) => setParam('vehicle', e.target.value)}
                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 text-sm bg-white"
              >
                <option value="">— Seleccionar unidad —</option>
                {vehicleOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const { start, end } = getCalendarMonthRange();
            const next = new URLSearchParams(searchParams);
            next.set('start', start);
            next.set('end', end);
            setSearchParams(next, { replace: true });
          }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Mes en curso
        </button>
      </div>

      {reportMode === 'unit' && !vehicleId && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500 text-sm">
          Elige fechas y una unidad para ver el reporte.
        </div>
      )}

      {reportMode === 'company' && loadingCompanyReport && <Loading />}

      {reportMode === 'company' && !loadingCompanyReport && companyReport && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} className="text-slate-600" />
                Resumen empresa
              </h2>
              <p className="text-sm text-gray-600">
                {formatDateLocal(companyReport.period.start)} — {formatDateLocal(companyReport.period.end)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
            >
              <FileDown size={18} />
              {pdfGenerating ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              companySummary.has_profit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <p className={`text-xl font-bold tabular-nums ${companySummary.has_profit ? 'text-emerald-800' : 'text-red-700'}`}>
              Flujo del periodo: {formatCurrency(companySummary.net_flow)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Ingresos {formatCurrency(companySummary.total_income)} − Egresos{' '}
              {formatCurrency(companySummary.total_expenses)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <SummaryCard icon={FileCheck} label="Viajes" value={String(companySummary.total_trips)} />
            <SummaryCard icon={DollarSign} label="Ingresos" value={formatCurrency(companySummary.total_income)} />
            <SummaryCard icon={Receipt} label="Egresos" value={formatCurrency(companySummary.total_expenses)} />
            <SummaryCard icon={BadgePercent} label="Impuestos / IMSS" value={formatCurrency(companySummary.total_taxes)} />
            <SummaryCard icon={Users} label="Por cobrar" value={formatCurrency(companySummary.por_cobrar_total)} hint={`${companySummary.por_cobrar_count} contratos`} />
            <SummaryCard icon={Landmark} label="Saldo cuentas" value={formatCurrency(companySummary.accounts_net_balance)} />
          </div>

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Por unidad de negocio</h3>
            </div>
            {companyReport.by_unit?.length ? (
              <Table columns={companyUnitColumns} data={companyReport.by_unit} />
            ) : (
              <p className="p-6 text-sm text-gray-500 text-center">Sin movimiento por unidad en este periodo.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Cuentas bancarias y medios de pago</h3>
              <p className="text-xs text-gray-500 mt-0.5">Saldo neto del periodo (ingresos − egresos por cuenta)</p>
            </div>
            {(companyReport.accounts_by_type?.length > 0 || companyReport.accounts_by_bank?.length > 0) ? (
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {companyReport.accounts_by_type?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por tipo</p>
                    <div className="space-y-1.5">
                      {companyReport.accounts_by_type.map((t) => (
                        <div key={t.account_type} className="flex justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                          <span className="text-gray-700">
                            {t.account_type} <span className="text-gray-400">({t.count})</span>
                          </span>
                          <span className={`font-semibold tabular-nums ${t.total_balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatCurrency(t.total_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {companyReport.accounts_by_bank?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por banco</p>
                    <div className="space-y-1.5">
                      {companyReport.accounts_by_bank.map((b) => (
                        <div key={b.bank_name} className="flex justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                          <span className="text-gray-700 truncate pr-2">
                            {b.bank_name} <span className="text-gray-400">({b.count})</span>
                          </span>
                          <span className={`font-semibold tabular-nums shrink-0 ${b.total_balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatCurrency(b.total_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-6 text-sm text-gray-500 text-center">Sin movimiento en cuentas en este periodo.</p>
            )}
          </section>

          {companyReport.expenses_by_type?.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Egresos por tipo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {companyReport.expenses_by_type.slice(0, 12).map((e) => (
                  <div key={e.expense_type} className="flex justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-gray-700 truncate pr-2">{e.expense_type}</span>
                    <span className="font-semibold tabular-nums shrink-0">{formatCurrency(e.total)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {reportMode === 'unit' && vehicleId && loadingReport && <Loading />}

      {reportMode === 'unit' && vehicleId && !loadingReport && report && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-start gap-3 min-w-0">
                <Bus className="text-slate-600 shrink-0 mt-0.5" size={22} />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{report.vehicle?.label}</h2>
                  <p className="text-sm text-gray-600">
                    {formatDateLocal(report.period.start)} — {formatDateLocal(report.period.end)}
                    {report.vehicle?.license_plate && (
                      <span className="ml-2 text-gray-500">· Placas {report.vehicle.license_plate}</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold shadow-sm disabled:opacity-50 shrink-0"
              >
                <FileDown size={18} aria-hidden />
                {pdfGenerating ? 'Generando…' : 'Descargar PDF'}
              </button>
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              profitPositive
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {profitPositive ? (
                <TrendingUp className="text-emerald-700" size={22} />
              ) : (
                <TrendingDown className="text-red-600" size={22} />
              )}
              <p className="font-semibold text-gray-900">
                {profitPositive ? 'El periodo tuvo utilidad' : 'El periodo tuvo pérdida'}
              </p>
            </div>
            <p
              className={`text-2xl font-bold tabular-nums ${
                profitPositive ? 'text-emerald-800' : 'text-red-700'
              }`}
            >
              Utilidad proyectada: {formatCurrency(summary.profit_projected)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Cotizado − egresos (viajes + mantenimiento + créditos y otros de unidad). Cobrado en
              periodo: {formatCurrency(summary.total_income_collected)} · Utilidad con cobrado:{' '}
              <span
                className={
                  summary.profit_collected >= 0 ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'
                }
              >
                {formatCurrency(summary.profit_collected)}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <SummaryCard
              icon={FileCheck}
              label="Viajes"
              value={String(summary.contracts_count)}
            />
            <SummaryCard
              icon={Users}
              label="Clientes"
              value={String(summary.clients.length)}
              hint={summary.clients.slice(0, 2).join(', ') + (summary.clients.length > 2 ? '…' : '')}
            />
            <SummaryCard
              icon={DollarSign}
              label="Cotizado"
              value={formatCurrency(summary.total_quoted)}
            />
            <SummaryCard
              icon={DollarSign}
              label="Ingresos cobrados"
              value={formatCurrency(summary.total_income_collected)}
            />
            <SummaryCard
              icon={Receipt}
              label="Egresos viajes"
              value={formatCurrency(summary.total_contract_expenses)}
            />
            <SummaryCard
              icon={Wrench}
              label="Mantenimiento"
              value={formatCurrency(summary.total_maintenance_cost)}
            />
            <SummaryCard
              icon={CreditCard}
              label="Pagos crédito"
              value={formatCurrency(summary.total_credit_expenses ?? 0)}
            />
          </div>

          {summary.clients.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Clientes en el periodo
              </p>
              <p className="text-sm text-gray-800">{summary.clients.join(' · ')}</p>
            </div>
          )}

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileCheck size={18} className="text-blue-600" />
                Contratos realizados ({report.contracts.length})
              </h3>
            </div>
            {report.contracts.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Sin contratos en este periodo.</p>
            ) : (
              <Table columns={unitColumns} data={report.contracts} />
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wrench size={18} className="text-violet-600" />
                Mantenimientos ({report.maintenance.length})
              </h3>
            </div>
            {report.maintenance.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                Sin mantenimientos registrados en este periodo.
              </p>
            ) : (
              <Table columns={maintenanceColumns} data={report.maintenance} />
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={18} className="text-amber-600" />
                Pagos de crédito ({report.credit_expenses?.length ?? 0})
                {(summary.total_credit_expenses ?? 0) > 0 && (
                  <span className="text-sm font-bold text-amber-800 tabular-nums ml-auto">
                    {formatCurrency(summary.total_credit_expenses)}
                  </span>
                )}
              </h3>
            </div>
            {!report.credit_expenses?.length ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                Sin pagos de crédito en este periodo para esta unidad.
              </p>
            ) : (
              <Table columns={expenseColumns} data={report.credit_expenses} />
            )}
          </section>

          {(summary.total_other_unit_expenses ?? 0) > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt size={18} className="text-slate-600" />
                  Otros egresos de unidad ({report.other_unit_expenses?.length ?? 0})
                  <span className="text-sm font-bold text-slate-800 tabular-nums ml-auto">
                    {formatCurrency(summary.total_other_unit_expenses)}
                  </span>
                </h3>
              </div>
              <Table columns={expenseColumns} data={report.other_unit_expenses} />
            </section>
          )}
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <Icon size={14} />
        <p className="text-[10px] uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className="text-sm font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={hint}>{hint}</p>}
    </div>
  );
}

export default Reports;
