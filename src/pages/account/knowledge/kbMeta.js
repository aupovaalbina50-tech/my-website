// Vocabulary of the knowledge base (tables kb_sources / kb_entries). The
// keys match the CHECK constraints of migration 0030.

const L = (kk, ru) => ({ kk, ru })

export const KB_CATEGORIES = [
  { key: 'fire_safety', label: L('Өрт қауіпсіздігі', 'Пожарная безопасность') },
  { key: 'civil_protection', label: L('Азаматтық қорғау', 'Гражданская защита') },
  { key: 'civil_defense', label: L('Азаматтық қорғаныс', 'Гражданская оборона') },
  { key: 'emergencies', label: L('Төтенше жағдайлар', 'Чрезвычайные ситуации') },
  { key: 'rescue_ops', label: L('Авариялық-құтқару жұмыстары', 'Аварийно-спасательные работы') },
  { key: 'fire_equipment', label: L('Өрт техникасы', 'Пожарная техника') },
  { key: 'baf', label: L('ГТҚҚ', 'ГДЗС') },
  { key: 'forces', label: L('Күштер мен құралдар', 'Силы и средства') },
  { key: 'evacuation', label: L('Эвакуация', 'Эвакуация') },
  { key: 'coordination', label: L('Басқару және өзара іс-қимыл', 'Управление и взаимодействие') },
  { key: 'documents', label: L('Қызметтік құжаттар', 'Служебные документы') },
  { key: 'terminology', label: L('Терминология', 'Терминология') },
  { key: 'regulations', label: L('Нормативтік құжаттар', 'Нормативные документы') },
  { key: 'ranks', label: L('Лауазымдар мен атақтар', 'Должности и звания') },
  { key: 'tactics', label: L('Бөлімшелердің іс-қимыл тактикасы', 'Тактика действий подразделений') },
]

export const KB_KINDS = [
  { key: 'term', label: L('Термин', 'Термин') },
  { key: 'definition', label: L('Анықтама', 'Определение') },
  { key: 'norm', label: L('Норма', 'Норма') },
  { key: 'phrase', label: L('Тұрақты тұжырым', 'Стандартная формулировка') },
  { key: 'rule', label: L('Рәсімдеу ережесі', 'Правило оформления') },
  { key: 'template', label: L('Үлгі', 'Шаблон') },
  { key: 'position', label: L('Лауазым / атақ', 'Должность / звание') },
  { key: 'other', label: L('Басқа', 'Другое') },
]

export const KB_STATUSES = [
  { key: 'official', label: L('Ресми', 'Официальный') },
  { key: 'needs_review', label: L('Тексеруді қажет етеді', 'Требует проверки') },
  { key: 'outdated', label: L('Ескірген', 'Устаревший') },
]

export const KB_PRIORITIES = [
  { key: 1, label: L('1 — ТЖМ ішкі базасы', '1 — внутренняя база МЧС') },
  { key: 2, label: L('2 — ҚР нормативтік құқықтық актісі', '2 — нормативный правовой акт РК') },
  { key: 3, label: L('3 — ресми мемлекеттік ресурс', '3 — официальный государственный ресурс') },
  { key: 4, label: L('4 — басқа тексерілген дереккөз', '4 — другой проверенный источник') },
]

export const labelOf = (list, key, lang) => list.find((i) => i.key === key)?.label[lang] ?? key
