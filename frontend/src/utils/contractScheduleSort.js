const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');

/** Minutos desde medianoche según serviceTime (servicio) o departureTime (contrato). Sin hora → fin del día. */
export const getContractStartTimeMinutes = (row) => {
  try {
    const notes = row?.notes ? JSON.parse(row.notes) : {};
    const raw =
      notes.mode === 'servicio'
        ? notes.serviceTime
        : notes.departureTime || notes.serviceTime;
    if (raw == null || String(raw).trim() === '') return 24 * 60;

    const cleaned = String(raw).trim().replace(/^[~≈]\s*/, '');
    const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return 24 * 60;

    const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return hours * 60 + minutes;
  } catch {
    return 24 * 60;
  }
};

/** Fecha inicio desc; misma fecha → hora inicio asc; empate → folio. */
export const compareContractsByStartSchedule = (a, b) => {
  const dateA = dateOnly(a?.start_date);
  const dateB = dateOnly(b?.start_date);
  if (dateA !== dateB) return dateB.localeCompare(dateA);

  const timeDiff = getContractStartTimeMinutes(a) - getContractStartTimeMinutes(b);
  if (timeDiff !== 0) return timeDiff;

  return String(a?.contract_number || '').localeCompare(
    String(b?.contract_number || ''),
    'es'
  );
};

export const sortContractsByStartSchedule = (contracts) =>
  [...contracts].sort(compareContractsByStartSchedule);
