// Template: рапорт начальника караула о выезде на пожар / происшествие.
//
// A template describes WHAT the report consists of; the editor and the
// server stay generic. Adding a document type (or a departmental template)
// = a new file like this one + an entry in ./index.js.
//
//   groups    — step 2 is split into short collapsible groups; `open: true`
//               groups (the key facts) are always shown
//   facts     — fields of step 2 (keys match the server's FACT_KEYS);
//               `required` ones are flagged as missing when empty
//   timeline  — time fields in the order events must happen (chronology check)
//   header    — requisites typed by the user (кому / от кого)
//   sections  — parts of the report body, in order; `guidance` tells the
//               model what each part must contain

const L = (kk, ru) => ({ kk, ru })

export const incidentReport = {
  type: 'incident_report',
  name: L('Өртке (оқиғаға) шығу туралы рапорт', 'Рапорт о выезде на пожар (происшествие)'),
  docTitle: L('РАПОРТ', 'РАПОРТ'),
  groups: [
    { key: 'call', open: true, title: L('Хабар', 'Вызов') },
    { key: 'timeline', open: true, title: L('Уақыт', 'Хронология') },
    { key: 'people', open: true, title: L('Адамдар', 'Люди') },
    { key: 'situation', title: L('Жағдай', 'Обстановка') },
    { key: 'forces', title: L('Күштер мен құралдар', 'Силы и средства') },
    { key: 'consequences', title: L('Салдары мен себебі', 'Последствия и причина') },
  ],
  facts: [
    // Вызов
    { key: 'date', group: 'call', required: true, label: L('Күні', 'Дата') },
    { key: 'place', group: 'call', required: true, label: L('Орны (мекенжайы)', 'Место (адрес)') },
    { key: 'object', group: 'call', required: true, label: L('Объект', 'Объект') },
    { key: 'unit', group: 'call', required: true, label: L('Бөлімше', 'Подразделение') },
    { key: 'incidentCommander', group: 'call', required: true, label: L('Өрт сөндіру басшысы (ӨСБ)', 'Руководитель тушения пожара (РТП)') },
    { key: 'reportedBy', group: 'call', label: L('Кім хабарлады', 'Кто сообщил') },
    { key: 'fireRank', group: 'call', label: L('Өрттің нөмірі (дәрежесі)', 'Номер (ранг) пожара') },
    // Хронология
    { key: 'time', group: 'timeline', required: true, time: true, label: L('Хабар түсті', 'Сообщение') },
    { key: 'departureTime', group: 'timeline', required: true, time: true, label: L('Шығу', 'Выезд') },
    { key: 'arrivalTime', group: 'timeline', required: true, time: true, label: L('Келу', 'Прибытие') },
    { key: 'firstNozzleTime', group: 'timeline', time: true, label: L('Бірінші оқпан', 'Первый ствол') },
    { key: 'localizationTime', group: 'timeline', time: true, label: L('Оқшаулау', 'Локализация') },
    { key: 'liquidationTime', group: 'timeline', required: true, time: true, label: L('Жою', 'Ликвидация') },
    { key: 'returnTime', group: 'timeline', time: true, label: L('Бөлімшеге оралу', 'Возвращение') },
    // Люди
    { key: 'rescued', group: 'people', label: L('Құтқарылды', 'Спасено') },
    { key: 'evacuated', group: 'people', label: L('Эвакуацияланды', 'Эвакуировано') },
    { key: 'injured', group: 'people', required: true, label: L('Зардап шекті', 'Пострадало') },
    { key: 'dead', group: 'people', required: true, label: L('Қаза тапты', 'Погибло') },
    // Обстановка
    { key: 'situation', group: 'situation', wide: true, label: L('Келген кездегі жағдай', 'Обстановка по прибытии') },
    { key: 'fireArea', group: 'situation', label: L('Өрт ауданы', 'Площадь пожара') },
    { key: 'objectInfo', group: 'situation', label: L('Объектінің сипаттамасы', 'Характеристика объекта') },
    // Силы и средства
    { key: 'forces', group: 'forces', wide: true, label: L('Бөлімшелер, техника, жеке құрам', 'Отделения, техника, личный состав') },
    { key: 'nozzles', group: 'forces', label: L('Берілген оқпандар', 'Поданные стволы') },
    { key: 'bafTeams', group: 'forces', label: L('ГТҚҚ буындары', 'Звенья ГДЗС') },
    { key: 'waterSource', group: 'forces', label: L('Су көзі', 'Водоисточник') },
    { key: 'cooperation', group: 'forces', label: L('Өзара іс-қимыл қызметтері', 'Службы взаимодействия') },
    // Последствия и причина
    { key: 'damage', group: 'consequences', label: L('Залал', 'Ущерб') },
    { key: 'cause', group: 'consequences', label: L('Болжамды себебі', 'Предполагаемая причина') },
    { key: 'staffInjuries', group: 'consequences', label: L('Жеке құрамның жарақаттары, техника ақаулары', 'Травмы личного состава, неисправности техники') },
    { key: 'other', group: 'consequences', wide: true, label: L('Басқа мәліметтер', 'Другая информация') },
  ],
  // Order of events; `maxGapMin` = a longer gap from the previous point is
  // suspicious (usually a mistyped time or a duration read as a clock time).
  timeline: [
    { key: 'time' },
    { key: 'departureTime', maxGapMin: 30 },
    { key: 'arrivalTime', maxGapMin: 180 },
    { key: 'firstNozzleTime', maxGapMin: 60 },
    { key: 'localizationTime', maxGapMin: 24 * 60 },
    { key: 'liquidationTime', maxGapMin: 24 * 60 },
    { key: 'returnTime', maxGapMin: 24 * 60 },
  ],
  header: [
    { key: 'to', label: L('Кімге', 'Кому'), placeholder: L('Мысалы: №5 ӨСБ бастығына', 'Например: Начальнику ПЧ-5') },
    { key: 'from', label: L('Кімнен', 'От кого'), placeholder: L('Мысалы: күзет бастығы', 'Например: начальника караула') },
  ],
  sections: [
    {
      key: 'message',
      title: L('Хабардың түсуі', 'Поступление сообщения'),
      guidance: 'Дата и время поступления сообщения, кто и как сообщил, адрес и объект, номер (ранг) пожара. Начать со слов «Докладываю, что…» («Баяндаймын, …»).',
    },
    {
      key: 'arrival',
      title: L('Шығу, келу және жағдай', 'Выезд, прибытие и обстановка'),
      guidance: 'Время выезда и прибытия, обстановка по прибытии (что горело, где, задымление, угроза людям), площадь пожара, кто принял руководство тушением (РТП).',
    },
    {
      key: 'actions',
      title: L('Бөлімшенің іс-әрекеті', 'Действия подразделения'),
      guidance: 'Спасение и эвакуация людей, время подачи первого ствола, поданные стволы, работа звеньев ГДЗС, водоисточник — в той последовательности, как в описании.',
    },
    {
      key: 'result',
      title: L('Нәтиже', 'Результат'),
      guidance: 'Время локализации и ликвидации горения (происшествия), время возвращения в подразделение.',
    },
    {
      key: 'consequences',
      title: L('Салдары', 'Последствия'),
      guidance: 'Отдельно: спасено, эвакуировано, пострадало, погибло. Травмы личного состава и неисправности техники. Ущерб. Предполагаемая причина — только если указана, со словом «предварительно».',
    },
    {
      key: 'forces',
      title: L('Күштер мен құралдар', 'Силы и средства'),
      guidance: 'Привлечённые силы и средства (отделения, техника, личный состав) и службы взаимодействия.',
    },
  ],
}
