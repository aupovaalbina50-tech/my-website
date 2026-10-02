import { AlertTriangle, Compass, DoorOpen, Factory, Flame, HeartPulse, Radio, Shield, Wrench } from 'lucide-react'

// Each mission maps 1:1 onto one of the site's 9 real term categories
// (CATEGORIES in i18n/translations.js) — category labels are looked up
// from there, never duplicated here, so they stay in sync automatically.
// `completion` is the "successfully did X" phrasing shown as the mission's
// final stage — kept as hand-written text rather than derived from `title`
// since Kazakh word order (and a couple of compound verbs) doesn't reduce
// to a generic "insert an adverb" transform. `actionLabel` is a short
// noun naming the mission's core action, used as stage 3's label in the
// Step 3 operation walkthrough ("01 Оценка ситуации / 02 Определение зоны
// / 03 {actionLabel} / 04 Контроль") — the other three stage names are
// generic across all missions, only this one needs to be mission-specific.
// `achievement` is the title shown on the reward screen once the mission
// is completed (mission_completions row exists) — a curated specialist
// title, not derived from the category name.
export const MISSIONS = [
  {
    id: 'stabilize-emergency',
    number: '01',
    categoryKey: 'emergencies',
    Icon: AlertTriangle,
    requiredTerms: 15,
    title: { kk: 'Төтенше жағдайдың өршуін тоқтату', ru: 'Стабилизировать чрезвычайную ситуацию' },
    completion: {
      kk: 'Төтенше жағдайдың өршуін сәтті тоқтату',
      ru: 'Успешно стабилизировать чрезвычайную ситуацию',
    },
    actionLabel: { kk: 'Өршуін тоқтату', ru: 'Стабилизация' },
    achievement: { kk: 'Төтенше жағдайлар жөніндегі маман', ru: 'Основы чрезвычайных ситуаций' },
  },
  {
    id: 'extinguish-fire',
    number: '02',
    categoryKey: 'fire_safety',
    Icon: Flame,
    requiredTerms: 15,
    title: { kk: 'Өртті сөндіру', ru: 'Ликвидировать пожар' },
    completion: {
      kk: 'Өртті сәтті сөндіру',
      ru: 'Успешно ликвидировать пожар',
    },
    actionLabel: { kk: 'Сөндіру', ru: 'Тушение' },
    achievement: { kk: 'Өрт қауіпсіздігі маманы', ru: 'Специалист по пожарной безопасности' },
  },
  {
    id: 'contain-accident',
    number: '03',
    categoryKey: 'industrial_safety',
    Icon: Factory,
    requiredTerms: 15,
    title: { kk: 'Өнеркәсіптік аварияны оқшаулау', ru: 'Локализовать аварию' },
    completion: {
      kk: 'Өнеркәсіптік аварияны сәтті оқшаулау',
      ru: 'Успешно локализовать аварию',
    },
    actionLabel: { kk: 'Оқшаулау', ru: 'Локализация' },
    achievement: { kk: 'Өнеркәсіптік қауіпсіздік маманы', ru: 'Специалист по промышленной безопасности' },
  },
  {
    id: 'run-evacuation',
    number: '04',
    categoryKey: 'evacuation',
    Icon: DoorOpen,
    requiredTerms: 15,
    title: { kk: 'Халықты эвакуациялау', ru: 'Провести эвакуацию' },
    completion: {
      kk: 'Халықты сәтті эвакуациялау',
      ru: 'Успешно провести эвакуацию',
    },
    actionLabel: { kk: 'Эвакуациялау', ru: 'Эвакуация' },
    achievement: { kk: 'Эвакуация үйлестірушісі', ru: 'Координатор эвакуации' },
  },
  {
    id: 'organize-response',
    number: '05',
    categoryKey: 'coordination',
    Icon: Compass,
    requiredTerms: 15,
    title: { kk: 'Құтқару күштерінің іс-қимылын үйлестіру', ru: 'Организовать реагирование' },
    completion: {
      kk: 'Құтқару күштерінің іс-қимылын сәтті үйлестіру',
      ru: 'Успешно организовать реагирование',
    },
    actionLabel: { kk: 'Үйлестіру', ru: 'Реагирование' },
    achievement: { kk: 'Жедел іс-қимыл үйлестірушісі', ru: 'Координатор реагирования' },
  },
  {
    id: 'protect-population',
    number: '06',
    categoryKey: 'civil_defense',
    Icon: Shield,
    requiredTerms: 15,
    title: { kk: 'Халықты қорғау', ru: 'Защитить население' },
    completion: {
      kk: 'Халықты сәтті қорғау',
      ru: 'Успешно защитить население',
    },
    actionLabel: { kk: 'Қорғау', ru: 'Защита' },
    achievement: { kk: 'Азаматтық қорғаныс маманы', ru: 'Специалист гражданской обороны' },
  },
  {
    id: 'restore-facility',
    number: '07',
    categoryKey: 'rescue_ops',
    Icon: Wrench,
    requiredTerms: 15,
    title: { kk: 'Бүлінген нысанды қалпына келтіру', ru: 'Восстановить объект' },
    completion: {
      kk: 'Бүлінген нысанды сәтті қалпына келтіру',
      ru: 'Успешно восстановить объект',
    },
    actionLabel: { kk: 'Қалпына келтіру', ru: 'Восстановление' },
    achievement: { kk: 'Қалпына келтіру жұмыстарының маманы', ru: 'Специалист по восстановлению' },
  },
  {
    id: 'organize-medical-aid',
    number: '08',
    categoryKey: 'disaster_medicine',
    Icon: HeartPulse,
    requiredTerms: 15,
    title: { kk: 'Зардап шеккендерге медициналық көмек көрсету', ru: 'Организовать медицинскую помощь' },
    completion: {
      kk: 'Зардап шеккендерге медициналық көмекті сәтті көрсету',
      ru: 'Успешно организовать медицинскую помощь',
    },
    actionLabel: { kk: 'Медициналық көмек', ru: 'Медпомощь' },
    achievement: { kk: 'Апат медицинасы маманы', ru: 'Специалист медицины катастроф' },
  },
  {
    id: 'ensure-communications',
    number: '09',
    categoryKey: 'alerting_comms',
    Icon: Radio,
    requiredTerms: 15,
    title: { kk: 'Хабарлау мен байланысты қамтамасыз ету', ru: 'Обеспечить связь' },
    completion: {
      kk: 'Хабарлау мен байланысты сәтті қамтамасыз ету',
      ru: 'Успешно обеспечить связь',
    },
    actionLabel: { kk: 'Байланыс', ru: 'Связь' },
    achievement: { kk: 'Хабарлау және байланыс маманы', ru: 'Специалист по оповещению и связи' },
  },
]

export const TOTAL_MISSIONS = MISSIONS.length
