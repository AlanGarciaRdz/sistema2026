import React from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';

const Table = ({ columns, data, onView, onEdit, onDelete, customActions }) => {
  const hasActions = onView || onEdit || onDelete || customActions;

  return (
    <>
      {/* Vista móvil: tarjetas */}
      <div className="block sm:hidden space-y-2">
        {data && data.length > 0 ? (
          data.map((row, rowIndex) => (
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
                  {onEdit && (
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
              {columns.map((column, index) => (
                <th
                  style={column.width ? { width: column.width } : column.maxWidth ? { maxWidth: column.maxWidth } : undefined}
                  key={index}
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              {hasActions && (
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 ${column.wrap ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                      style={column.maxWidth ? { maxWidth: column.maxWidth } : undefined}
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
                        {onEdit && (
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