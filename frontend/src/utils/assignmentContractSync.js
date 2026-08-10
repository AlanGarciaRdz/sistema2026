export function parseContractNotes(notes) {
  if (!notes) return {};
  if (typeof notes === 'object' && !Array.isArray(notes)) return notes;
  try {
    const p = JSON.parse(notes);
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
}

export function getNotesAssignmentBlock(notes) {
  const n = parseContractNotes(notes);
  return n.assignment && typeof n.assignment === 'object' ? n.assignment : null;
}

/** Misma regla en Contratos y Asignaciones: la fila con fecha de viaje más reciente. */
export function pickPrimaryAssignment(rows) {
  if (!rows?.length) return null;
  return rows
    .slice()
    .sort((x, y) => {
      const dx = x.driving_date ? String(x.driving_date).slice(0, 10) : '';
      const dy = y.driving_date ? String(y.driving_date).slice(0, 10) : '';
      return dy.localeCompare(dx);
    })[0];
}

/** Combina fila de `assignments` con bloque `notes.assignment` (por si solo uno tiene chofer). */
export function mergeAssignmentForEdit(tableRow, contractNotes) {
  const notesBlock = getNotesAssignmentBlock(contractNotes);
  if (!tableRow && notesBlock) {
    return {
      id: null,
      contract_id: notesBlock.contract_id,
      driver_id: notesBlock.driver_id ?? null,
      vehicle_id: notesBlock.vehicle_id ?? null,
      driving_date: notesBlock.driving_date ?? null,
      assigned_date: notesBlock.assigned_date ?? null
    };
  }
  if (!tableRow) return null;
  if (!tableRow.driver_id && notesBlock?.driver_id) {
    return {
      ...tableRow,
      driver_id: notesBlock.driver_id,
      vehicle_id: tableRow.vehicle_id || notesBlock.vehicle_id,
      driving_date: tableRow.driving_date || notesBlock.driving_date,
      assigned_date: tableRow.assigned_date || notesBlock.assigned_date
    };
  }
  return tableRow;
}

/** Todos los choferes asignados al contrato (orden alfabético). */
export function getPrimaryDriverNames(contractId, assignments, contractNotes) {
  const rows = (assignments || []).filter(
    (a) => a.contract_id != null && String(a.contract_id) === String(contractId)
  );
  const fromRows = [...new Set(rows.map((r) => r.driver_name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );
  if (fromRows.length) return fromRows;

  const notes = parseContractNotes(contractNotes);
  if (Array.isArray(notes.assignments) && notes.assignments.length) {
    const fromNotes = [
      ...new Set(notes.assignments.map((a) => a.driver_name).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    if (fromNotes.length) return fromNotes;
  }

  const block = getNotesAssignmentBlock(contractNotes);
  if (block?.driver_name) return [block.driver_name];
  return [];
}

/** Filas de assignments para editar en el modal de contrato. */
export function getAssignmentsForContract(contractId, assignments, contractNotes) {
  const rows = (assignments || [])
    .filter((a) => a.contract_id != null && String(a.contract_id) === String(contractId))
    .slice()
    .sort((a, b) => {
      const na = String(a.driver_name || '');
      const nb = String(b.driver_name || '');
      return na.localeCompare(nb, 'es', { sensitivity: 'base' });
    });

  if (rows.length) {
    return rows.map((row) => mergeAssignmentForEdit(row, contractNotes)).filter(Boolean);
  }

  const block = getNotesAssignmentBlock(contractNotes);
  if (block?.driver_id) {
    return [
      {
        id: null,
        contract_id: contractId,
        driver_id: block.driver_id,
        vehicle_id: block.vehicle_id ?? null,
        driving_date: block.driving_date ?? null,
        assigned_date: block.assigned_date ?? null
      }
    ];
  }
  return [];
}

export function resolveAssignmentIdForContract(contractId, explicitId, assignments) {
  if (explicitId) return explicitId;
  const rows = (assignments || []).filter(
    (a) => a.contract_id != null && String(a.contract_id) === String(contractId)
  );
  return pickPrimaryAssignment(rows)?.id ?? null;
}

export function duplicateAssignmentIds(contractId, keepId, assignments) {
  return (assignments || [])
    .filter(
      (a) =>
        a.contract_id != null &&
        String(a.contract_id) === String(contractId) &&
        keepId != null &&
        String(a.id) !== String(keepId)
    )
    .map((a) => a.id);
}

export function driverIdFromAssignmentOrNotes(assignmentRow, contractNotes) {
  if (assignmentRow?.driver_id != null && assignmentRow.driver_id !== '') {
    return String(assignmentRow.driver_id);
  }
  const block = getNotesAssignmentBlock(contractNotes);
  if (block?.driver_id != null && block.driver_id !== '') {
    return String(block.driver_id);
  }
  return '';
}
