/** Profundidad de llanta (mm): aviso sin bloquear */
export const TIRE_DEPTH_WARN_MM = 3.5;
export const TIRE_DEPTH_CRITICAL_MM = 2.0;

export const INSPECTION_TYPE_LABELS = {
  pre_trip: 'Pre-viaje',
  post_trip: 'Post-viaje',
  general: 'General'
};

export const TIRE_ISSUE_OPTIONS = [
  { id: 'wear', label: 'Desgaste excesivo' },
  { id: 'pressure', label: 'Baja presión' },
  { id: 'damage', label: 'Daño visible' },
  { id: 'flat', label: 'Llanta ponchada' },
  { id: 'other', label: 'Otro' }
];

export const LIGHT_ITEMS = [
  { id: 'lights_low', label: 'Luz baja' },
  { id: 'lights_high', label: 'Luz alta' },
  { id: 'lights_turn', label: 'Direccionales' },
  { id: 'lights_stop', label: 'Stop' },
  { id: 'lights_plate', label: 'Luz de placa' }
];

export const BRAKE_ITEMS = [
  { id: 'brakes_pedal', label: 'Pedal de freno' },
  { id: 'brakes_noise', label: 'Sin ruidos anormales' },
  { id: 'brakes_parking', label: 'Freno de mano' }
];

export const FLUID_ITEMS = [
  { id: 'fluid_oil', label: 'Aceite motor' },
  { id: 'fluid_coolant', label: 'Refrigerante' },
  { id: 'fluid_washer', label: 'Limpiaparabrisas' }
];

export const INTERIOR_ITEMS = [
  { id: 'interior_seats', label: 'Asientos / cinturones' },
  { id: 'interior_ac', label: 'Aire acondicionado' },
  { id: 'interior_mirrors', label: 'Espejos' }
];

export const SAFETY_ITEMS = [
  { id: 'safety_extinguisher', label: 'Extintor' },
  { id: 'safety_triangle', label: 'Triángulos / botiquín' },
  { id: 'safety_horn', label: 'Claxon' }
];

export const CLEANLINESS_ITEMS = [
  { id: 'clean_exterior', label: 'Exterior' },
  { id: 'clean_interior', label: 'Interior' }
];

export const TIRE_POSITIONS = [
  { id: 'tire_fl', label: 'Delantera izquierda', emoji: '🛞' },
  { id: 'tire_fr', label: 'Delantera derecha', emoji: '🛞' },
  { id: 'tire_rl', label: 'Trasera izquierda', emoji: '🛞' },
  { id: 'tire_rr', label: 'Trasera derecha', emoji: '🛞' }
];

/**
 * Pasos del wizard (orden fijo). `type` define la UI de cada pantalla.
 */
export function buildWizardSteps() {
  const steps = [
    { id: 'start', type: 'start', title: 'Inicio' },
    { id: 'unit', type: 'unit', title: 'Datos de unidad' }
  ];

  for (const tire of TIRE_POSITIONS) {
    steps.push({
      id: tire.id,
      type: 'tire',
      title: tire.label,
      tireId: tire.id,
      tireLabel: tire.label,
      emoji: tire.emoji
    });
  }

  steps.push(
    { id: 'brakes', type: 'checklist', title: 'Frenos', section: 'brakes', items: BRAKE_ITEMS, emoji: '🛑' },
    { id: 'lights', type: 'checklist', title: 'Luces', section: 'lights', items: LIGHT_ITEMS, emoji: '💡' },
    {
      id: 'fluids',
      type: 'checklist',
      title: 'Niveles / motor',
      section: 'fluids',
      items: FLUID_ITEMS,
      emoji: '🛢️'
    },
    {
      id: 'interior',
      type: 'checklist',
      title: 'Interior',
      section: 'interior',
      items: INTERIOR_ITEMS,
      emoji: '🪑'
    },
    {
      id: 'safety',
      type: 'checklist',
      title: 'Seguridad',
      section: 'safety',
      items: SAFETY_ITEMS,
      emoji: '🦺'
    },
    {
      id: 'cleanliness',
      type: 'checklist',
      title: 'Limpieza',
      section: 'cleanliness',
      items: CLEANLINESS_ITEMS,
      emoji: '✨'
    },
    { id: 'notes', type: 'notes', title: 'Observaciones', emoji: '📝' },
    { id: 'summary', type: 'summary', title: 'Resumen', emoji: '✅' }
  );

  return steps;
}

export function emptyAnswersForSteps(steps) {
  const answers = {};
  for (const step of steps) {
    if (step.type === 'tire') {
      answers[step.tireId] = { label: step.tireLabel, status: null, depthMm: '', issues: [], comment: '', photos: [] };
    }
    if (step.type === 'checklist') {
      for (const item of step.items) {
        answers[item.id] = { label: item.label, pass: null, comment: '', photos: [] };
      }
    }
  }
  answers.notes_general = { text: '' };
  return answers;
}

export function localInspectionStorageKey(vehicleId, inspectionId) {
  return `rk_inspection_v1_${vehicleId}_${inspectionId}`;
}
