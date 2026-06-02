import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const PALETTE = [
  '#059669',
  '#0891b2',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#4f46e5',
  '#0d9488',
  '#ea580c',
  '#65a30d',
  '#e11d48',
  '#52525b'
];

/** Etiquetas cortas en el eje X (sin cambiar datos de lista / cards) */
function shortenBusinessUnit(name) {
  const n = (name || '').trim();
  if (!n) return '';
  let s = n.replace(/^CRAFTER\s+/i, 'C.').replace(/^GENERAL$/i, 'Gral').replace(/\s+GENERAL$/i, '');
  if (s.length <= 13) return s || n;
  return `${s.slice(0, 11)}…`;
}

function CompactAxisTick(props) {
  const { x, y, payload } = props;
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor="end"
      fill="#57534e"
      fontSize={11}
      transform={`rotate(-32 ${x} ${y})`}
    >
      {payload?.value ?? ''}
    </text>
  );
}

/** Coerciona saldos por si llegan como string (p. ej. numeric de PG en JSON). */
function parseMoney(v) {
  if (v == null) return NaN;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/\s/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Tooltip: valores por cuenta usando dataKey seg_* */
function buildTooltipAccounts(payload, lookup) {
  const byId = new Map();
  for (const item of payload) {
    const v = parseMoney(item.value);
    if (!Number.isFinite(v) || v === 0) continue;
    const key = typeof item.dataKey === 'string' ? item.dataKey : '';
    const m = /^seg_(.+)$/.exec(key);
    if (!m) continue;
    const id = m[1];
    if (!lookup.has(id)) continue;
    const meta = lookup.get(id);
    if (!byId.has(id)) {
      byId.set(id, {
        ...meta,
        value: v
      });
    } else {
      const cur = byId.get(id);
      cur.value += v;
    }
  }
  return [...byId.values()].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function AccountsTooltip({ active, payload, label, formatCurrency, tooltipRowMap }) {
  if (!active || !payload?.length) return null;
  const tk = payload[0]?.payload?.tooltipKey ?? payload[0]?.payload?.chartLabel;
  const accounts = buildTooltipAccounts(payload, tooltipRowMap.get(tk)?.lookup || new Map());
  if (!accounts.length) return null;

  const fullTitle = payload[0]?.payload?.unitFullLabel ?? label;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs max-w-xs">
      <p className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-2 truncate" title={fullTitle}>
        {fullTitle}
      </p>
      <ul className="space-y-1">
        {accounts.map((acc) => (
          <li key={acc.id} className="flex justify-between gap-3">
            <span className="text-gray-600 truncate mr-2" title={acc.label}>
              <span aria-hidden style={{ color: acc.color }}>{'\u2588 '} </span>
              {acc.label}
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${acc.value >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(acc.value)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-gray-400 border-t pt-2">Suma horizontal de cuentas = total de la unidad</p>
    </div>
  );
}

/**
 * Barras apiladas por cuenta por unidad de negocio.
 * Positivos: stack sobre cero hacia arriba; negativos: hacia abajo.
 */
export default function AccountsBusinessUnitStackedBar({ accountsByBusinessUnit, formatCurrency }) {
  const { chartData, series, legendMaxHeight, tooltipRowMap } = useMemo(() => {
    if (!accountsByBusinessUnit?.length) {
      return { chartData: [], series: [], legendMaxHeight: 36, tooltipRowMap: new Map() };
    }

    const byId = new Map();
    const weight = new Map();

    for (const unit of accountsByBusinessUnit) {
      for (const acc of unit.accounts || []) {
        const id =
          acc?.id !== undefined && acc?.id !== null
            ? String(acc.id)
            : `acct_${[
                unit.businessUnit ?? '',
                acc?.account_name ?? '',
                acc?.bank_name ?? ''
              ].join('|')}`;
        const balance = parseMoney(acc.balance);
        if (!Number.isFinite(balance)) continue;

        weight.set(id, (weight.get(id) || 0) + Math.abs(balance));

        if (!byId.has(id)) {
          const label = [acc.account_name || 'Cuenta', acc.bank_name].filter(Boolean).join(' — ');
          byId.set(id, { id, label });
        }
      }
    }

    const idsSorted = [...byId.keys()].sort((a, b) => (weight.get(b) || 0) - (weight.get(a) || 0));

    const tooltipRowMap = new Map();

    const chartData = accountsByBusinessUnit.map((unit) => {
      const chartLabel = shortenBusinessUnit(unit.businessUnit);
      const tooltipKey = unit.businessUnit || chartLabel;
      const lookup = new Map();
      idsSorted.forEach((id, i) => {
        lookup.set(id, {
          id,
          label: byId.get(id).label,
          color: PALETTE[i % PALETTE.length]
        });
      });
      tooltipRowMap.set(tooltipKey, { lookup });

      const row = {
        chartLabel,
        tooltipKey,
        unitFullLabel: unit.businessUnit || chartLabel
      };

      idsSorted.forEach((id) => {
        row[`seg_${id}`] = 0;
      });

      for (const acc of unit.accounts || []) {
        const id =
          acc?.id !== undefined && acc?.id !== null
            ? String(acc.id)
            : `acct_${[
                unit.businessUnit ?? '',
                acc?.account_name ?? '',
                acc?.bank_name ?? ''
              ].join('|')}`;
        const b = parseMoney(acc.balance);
        if (!lookup.has(id) || !Number.isFinite(b)) continue;
        row[`seg_${id}`] += b;
      }

      return row;
    });

    const activeSeries = idsSorted.filter((id) =>
      chartData.some((row) => Math.abs(parseMoney(row[`seg_${id}`])) > 0)
    );

    const series = activeSeries.map((id, idx) => {
      const paletteIdx = idsSorted.indexOf(id);
      const fill = PALETTE[(paletteIdx >= 0 ? paletteIdx : idx) % PALETTE.length];
      return {
        id,
        fill,
        label: byId.get(id).label
      };
    });

    const legendMaxHeight = Math.min(160, 28 + Math.ceil(series.length / 6) * 22);

    return { chartData, series, legendMaxHeight, tooltipRowMap };
  }, [accountsByBusinessUnit]);

  if (!chartData.length || !series.length) return null;

  const tooltipContent = (props) => (
    <AccountsTooltip {...props} formatCurrency={formatCurrency} tooltipRowMap={tooltipRowMap} />
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Barras apiladas por cuenta</h3>
      <p className="text-sm text-gray-600 mb-4 leading-snug">
        Composición del saldo de cada unidad por cuenta/banco. Los importes positivos se apilan hacia arriba y los negativos
        hacia abajo desde $0 — útil para ver de dónde viene el efectivo dentro de cada unidad.
      </p>
      <div className="w-full overflow-x-auto" style={{ minHeight: 440 }}>
        <ResponsiveContainer width="100%" height={440}>
          <BarChart stackOffset="sign" data={chartData} margin={{ top: 16, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              type="category"
              dataKey="chartLabel"
              tick={<CompactAxisTick />}
              height={72}
              interval={0}
            />
            <YAxis
              tickFormatter={(v) =>
                Intl.NumberFormat('es-MX', {
                  notation: Math.abs(v) >= 1000 ? 'compact' : 'standard',
                  maximumFractionDigits: 1,
                  compactDisplay: 'short'
                }).format(v)}
              stroke="#78716c"
              fontSize={11}
              width={52}
              tickLine={false}
            />
            <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }} />
            <Legend
              verticalAlign="bottom"
              height={legendMaxHeight}
              wrapperStyle={{ overflowY: 'auto', paddingTop: 6, fontSize: 11 }}
              formatter={(value) =>
                typeof value === 'string' && value.length > 32 ? `${value.slice(0, 30)}…` : value
              }
            />
            {series.map((s) => (
              <Bar
                key={s.id}
                dataKey={`seg_${s.id}`}
                name={s.label}
                stackId="sign-stack"
                fill={s.fill}
                isAnimationActive={false}
                radius={[2, 2, 2, 2]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
