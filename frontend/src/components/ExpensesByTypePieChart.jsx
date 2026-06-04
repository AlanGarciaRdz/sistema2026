import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const PALETTE = [
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#ca8a04',
  '#65a30d',
  '#059669',
  '#0891b2',
  '#0284c7',
  '#4f46e5',
  '#7c3aed',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#64748b',
  '#57534e'
];

function ExpensesTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const pct = row.percent != null ? `${row.percent.toFixed(1)}%` : '';
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-1">{row.name}</p>
      <p className="text-gray-700 tabular-nums">{formatCurrency(row.value)}</p>
      {pct && <p className="text-gray-500 mt-0.5">{pct} del total</p>}
      {row.count > 0 && (
        <p className="text-gray-500 mt-0.5">
          {row.count} movimiento{row.count === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export default function ExpensesByTypePieChart({ expensesByType, formatCurrency, periodLabel }) {
  const { chartData, total, topSlices } = useMemo(() => {
    const rows = (expensesByType || []).filter((r) => (parseFloat(r.total) || 0) > 0);
    const sum = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const sorted = rows
      .map((r) => ({
        name: r.expenseType || 'Sin tipo',
        value: parseFloat(r.total) || 0,
        count: r.count || 0
      }))
      .sort((a, b) => b.value - a.value);

    const maxSlices = 12;
    let slices = sorted;
    if (sorted.length > maxSlices) {
      const head = sorted.slice(0, maxSlices - 1);
      const rest = sorted.slice(maxSlices - 1);
      const restValue = rest.reduce((s, x) => s + x.value, 0);
      const restCount = rest.reduce((s, x) => s + x.count, 0);
      slices = [
        ...head,
        { name: `Otros (${rest.length} tipos)`, value: restValue, count: restCount }
      ];
    }

    const withPct = slices.map((s) => ({
      ...s,
      percent: sum > 0 ? (s.value / sum) * 100 : 0
    }));

    return { chartData: withPct, total: sum, topSlices: sorted.slice(0, 8) };
  }, [expensesByType]);

  if (!chartData.length || total <= 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Egresos por tipo de gasto</h2>
        <p className="text-sm text-gray-500 mb-2">{periodLabel}</p>
        <p className="text-sm text-gray-500">No hay egresos en este período (excl. transferencias entre cuentas).</p>
      </div>
    );
  }

  const tooltipContent = (props) => (
    <ExpensesTooltip {...props} formatCurrency={formatCurrency} />
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Egresos por tipo de gasto</h2>
          <p className="text-sm text-gray-500">{periodLabel}</p>
          <p className="text-sm font-semibold text-red-700 tabular-nums mt-1">
            Total: {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="w-full" style={{ minHeight: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={105}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={tooltipContent} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Principales conceptos
          </p>
          <ul className="space-y-2">
            {topSlices.map((row, i) => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    aria-hidden
                  />
                  <span className="text-gray-800 truncate" title={row.name}>
                    {row.name}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-gray-900 tabular-nums">
                  {formatCurrency(row.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
