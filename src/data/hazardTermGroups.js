// Second-level thematic grouping, applied only within the term set already
// matched for a hazard (see hazardTermLinks.js). Each hazard lists its
// groups in priority order — a term is assigned to the first group whose
// kk/ru keywords match its text; anything left over is reported separately
// by getHazardGroups() as "ungrouped" rather than forced into one.
//
// Only hazards with enough real, thematically distinct terms get an entry
// here — the ones checked against supabase/migrations and found to split
// cleanly (fire_safety and industrial_safety are large, structured
// categories; the radiation subset is small but has two clear angles).
// Hazards without enough real signal for a meaningful split (flood,
// landslide, earthquake, wind, chemical — a handful of terms each, see
// hazardTermLinks.js) are intentionally left out here; the map falls back
// to a flat term list for them instead of inventing categories.
//
// Like hazardTermLinks.js, this is a client-side stand-in for a relation
// that would eventually live in Supabase (e.g. a `group_id` column on
// `terms`, or a `term_groups` lookup table keyed by hazard + group id).
export const HAZARD_TERM_GROUPS = {
  fire: [
    {
      id: 'causes',
      label: { kk: 'Себептері', ru: 'Причины', en: 'Causes' },
      keywords: [
        'возгора',
        'воспламен',
        'зажиган',
        'вспышк',
        'искр',
        'горени',
        'горюч',
        'пламя',
        'огонь',
        'самовоспламен',
      ],
    },
    {
      id: 'hazard',
      label: { kk: 'Қауіп пен тәуекел', ru: 'Опасность и риск', en: 'Hazard and risk' },
      keywords: [
        'опасност',
        'безопасност',
        'риск',
        'огнестойк',
        'жертва',
        'зона пожара',
        'масштаб пожара',
        'интенсивность пожара',
      ],
    },
    {
      id: 'prevention',
      label: { kk: 'Алдын алу және қорғау', ru: 'Профилактика и защита', en: 'Prevention and protection' },
      keywords: ['противопожар', 'огнезащит', 'огнеупор', 'защита лесов'],
    },
    {
      id: 'extinguishing',
      label: { kk: 'Сөндіру', ru: 'Тушение', en: 'Extinguishing' },
      keywords: [
        'тушен',
        'огнетуш',
        'рукав',
        'гидрант',
        'пена',
        'пенообразовател',
        'лестниц',
        'насос',
        'извещател',
        'оповещател',
        'депо',
        'катер',
        'водопровод',
        'водоисточник',
        'аэрозоль',
        'локализац',
        'очаг',
        'ствол',
        'пожар',
      ],
    },
  ],
  industrial: [
    {
      id: 'equipment',
      label: { kk: 'Жабдық және жүйелер', ru: 'Оборудование и системы', en: 'Equipment and systems' },
      keywords: [
        'клапан',
        'насос',
        'двигат',
        'датчик',
        'генератор',
        'горелк',
        'заслонк',
        'адаптер',
        'арматур',
        'блок',
        'дозаправ',
      ],
    },
    {
      id: 'water',
      label: { kk: 'Су және гидрожүйелер', ru: 'Вода и гидросистемы', en: 'Water and hydraulic systems' },
      keywords: ['вод', 'гидр', 'дамб', 'запруд', 'сточ'],
    },
    {
      id: 'radiation',
      label: { kk: 'Сәулелену және радиация', ru: 'Излучение и радиация', en: 'Radiation' },
      keywords: ['радиа', 'радио', 'излучен', 'доз', 'ядр', 'бета-', 'гамма-'],
    },
    {
      id: 'environment',
      label: { kk: 'Экология және салдары', ru: 'Экология и последствия', en: 'Environment and consequences' },
      keywords: ['загрязн', 'отход', 'эколог', 'лес', 'засолен'],
    },
  ],
  radiation: [
    {
      id: 'safety',
      label: { kk: 'Қауіпсіздік', ru: 'Безопасность', en: 'Safety' },
      keywords: ['безопасност', 'опасност', 'нормативн', 'служба'],
    },
    {
      id: 'measurement',
      label: { kk: 'Шығарынды және өлшеу', ru: 'Выброс и измерение', en: 'Release and measurement' },
      keywords: ['выброс', 'концентрац', 'йод'],
    },
  ],
}
