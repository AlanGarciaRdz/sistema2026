/** Placa / código de unidad desde fila de contrato (vehicle_name o notes.vehicle). */
export const getContractUnitInfo = (row) => {
  if (!row) return { plate: null, unitType: null };

  let unitType = null;
  try {
    const n = row.notes ? JSON.parse(row.notes) : {};
    unitType = n.unitType || n.vehicle?.vehicle_type || null;
  } catch {
    /* ignore */
  }

  const plate =
    row.vehicle_name ||
    (() => {
      try {
        const n = row.notes ? JSON.parse(row.notes) : {};
        const v = n.vehicle;
        return v?.license_plate || v?.vehicle_code || v?.plate || null;
      } catch {
        return null;
      }
    })();

  return { plate, unitType };
};

/** URL del portal chofer; con ingreso=1 y unidad/tipo si el contrato los tiene. */
export const buildDriverPortalUrl = (contractNumber, { ingreso = false, row } = {}) => {
  const params = new URLSearchParams();
  if (ingreso) params.set('ingreso', '1');

  if (row) {
    const { plate, unitType } = getContractUnitInfo(row);
    if (plate) params.set('unidad', plate);
    if (unitType) params.set('unitType', unitType);
  }

  const qs = params.toString();
  const base = `/c/${encodeURIComponent(contractNumber)}`;
  return qs ? `${base}?${qs}` : base;
};

/** Misma info desde contrato del portal (API) + query params opcionales. */
export const resolvePortalUnitDisplay = (contract, searchParams) => {
  const fromQuery = {
    plate: searchParams.get('unidad')?.trim() || null,
    unitType: searchParams.get('unitType')?.trim() || null
  };

  if (!contract) return fromQuery.plate || fromQuery.unitType ? fromQuery : null;

  const rowLike = {
    vehicle_name: contract.vehicle_name,
    notes: contract.notes
  };
  const fromContract = getContractUnitInfo(rowLike);

  return {
    plate: fromContract.plate || fromQuery.plate,
    unitType: fromContract.unitType || fromQuery.unitType
  };
};
