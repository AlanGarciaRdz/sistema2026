import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Eye, ChevronUp, ChevronDown } from 'lucide-react';

const Table = ({ columns, data, onView, onEdit, onDelete, customActions, sortable, canEditRow }) => {
  const hasActions = onView || onEdit || onDelete || customActions;
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedData = useMemo(() => {
    if (!sortable || !sortKey || !data?.length) return data || [];
    const accessor = sortKey;
    return [...data].sort((a, b) => {
      let va = a[accessor];
      let vb = b[accessor];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDirection === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa.localeCompare(sb);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDirection, sortable]);

  const handleSort = (column) => {
    const key = column.sortAccessor || column.accessor;
    if (!key) return;
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const displayData = sortable ? sortedData : (data || []);

  return (
    <>
      {/* Vista móvil: tarjetas */}
      <div className="block sm:hidden space-y-2">
        {displayData && displayData.length > 0 ? (
          displayData.map((row, rowIndex) => (
            <div key={rowIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4">
                {columns.map((column, colIndex) => {
                  const value = column.render ? column.render(row) : row[column.accessor];
                  if (!value && value !== 0) return null;
                  return (
                    <div key={colIndex} className="flex flex-col mb-2 last:mb-0">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                        {column.header}
                      </span>
                      <span className="text-sm text-gray-900 break-words leading-snug">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
              {hasActions && (
                <div className="flex justify-end gap-1 px-3 py-2 bg-gray-50 border-t border-gray-100">
                  {customActions && customActions(row)}
                  {onView && (
                    <button onClick={() => onView(row)} className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-100 transition-colors" title="Ver">
                      <Eye size={17} />
                    </button>
                  )}
                  {onEdit && (!canEditRow || canEditRow(row)) && (
                    <button onClick={() => onEdit(row)} className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-100 transition-colors" title="Editar">
                      <Edit size={17} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No hay datos disponibles
          </div>
        )}
      </div>

      {/* Vista desktop: tabla normal */}
      <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => {
                const key = column.sortAccessor || column.accessor;
                const canSort = sortable && key;
                const isActive = sortKey === key;
                const widthStyle = column.width
                  ? { width: column.width, maxWidth: column.width }
                  : column.maxWidth
                    ? { maxWidth: column.maxWidth }
                    : undefined;
                return (
                  <th
                    style={widthStyle}
                    key={index}
                    onClick={() => canSort && handleSort(column)}
                    className={`sticky top-0 z-10 bg-gray-50 px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[inset_0_-1px_0_0_rgb(229,231,235)] ${
                      canSort ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.headerRender ? column.headerRender() : column.header}
                      {canSort && isActive && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </span>
                  </th>
                );
              })}
              {hasActions && (
                <th className="sticky top-0 z-10 bg-gray-50 px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[inset_0_-1px_0_0_rgb(229,231,235)]">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayData && displayData.length > 0 ? (
              displayData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 ${column.wrap ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                      style={
                        column.width
                          ? { width: column.width, maxWidth: column.width }
                          : column.maxWidth
                            ? { maxWidth: column.maxWidth }
                            : undefined
                      }
                    >
                      {column.render ? column.render(row) : row[column.accessor]}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        {customActions && customActions(row)}
                        {onView && (
                          <button onClick={() => onView(row)} className="text-blue-600 hover:text-blue-900 transition-colors p-1" title="Ver">
                            <Eye size={18} />
                          </button>
                        )}
                        {onEdit && (!canEditRow || canEditRow(row)) && (
                          <button onClick={() => onEdit(row)} className="text-green-600 hover:text-green-900 transition-colors p-1" title="Editar">
                            <Edit size={18} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(row)} className="text-red-600 hover:text-red-900 transition-colors p-1" title="Eliminar">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-gray-500">
                  No hay datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Table;