import { HeartPulse, LifeBuoy, Footprints, Megaphone, Network, ShieldHalf, TriangleAlert } from 'lucide-react'

// Second layer of the "Terminological map": areas of activity that apply to
// every kind of emergency (rescue, disaster medicine, evacuation, alerting,
// command, civil defence, general emergency notions). They are not hazard
// types, so they get their own layer instead of being forced into the
// hazard ring. Each node takes the terms of one existing `terms.category`
// (see HAZARD_TERM_LINKS), so every term of these categories — including
// ones added later — appears here automatically.
export const ACTIVITY_AREAS = [
  {
    id: 'act-rescue',
    Icon: LifeBuoy,
    name: { kk: 'Авариялық-құтқару жұмыстары', ru: 'Аварийно-спасательные работы', en: 'Rescue operations' },
  },
  {
    id: 'act-medicine',
    Icon: HeartPulse,
    name: { kk: 'Апат медицинасы', ru: 'Медицина катастроф', en: 'Disaster medicine' },
  },
  {
    id: 'act-evacuation',
    Icon: Footprints,
    name: { kk: 'Эвакуация', ru: 'Эвакуация', en: 'Evacuation' },
  },
  {
    id: 'act-alerting',
    Icon: Megaphone,
    name: { kk: 'Хабарлау және байланыс', ru: 'Оповещение и связь', en: 'Alerting and communications' },
  },
  {
    id: 'act-coordination',
    Icon: Network,
    name: { kk: 'Басқару және үйлестіру', ru: 'Управление и координация', en: 'Command and coordination' },
  },
  {
    id: 'act-civil-defense',
    Icon: ShieldHalf,
    name: { kk: 'Азаматтық қорғаныс', ru: 'Гражданская оборона', en: 'Civil defence' },
  },
  {
    id: 'act-emergencies',
    Icon: TriangleAlert,
    name: { kk: 'Төтенше жағдайлар (жалпы ұғымдар)', ru: 'Чрезвычайные ситуации (общие понятия)', en: 'Emergencies (general notions)' },
  },
]
