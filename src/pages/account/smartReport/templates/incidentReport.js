// Template: рапорт начальника караула о выезде на пожар / происшествие.
//
// A template describes WHAT the report consists of; the editor and the
// server stay generic. Adding a document type (or a departmental template)
// = a new file like this one + an entry in ./index.js.
//
//   facts     — fields of step 2 (keys match the server's FACT_KEYS);
//               `required` ones are flagged as missing when empty
//   header    — requisites typed by the user (кому / от кого)
//   sections  — parts of the report body, in order; `guidance` tells the
//               model what each part must contain

export const incidentReport = {
  type: 'incident_report',
  name: { kk: 'Өртке (оқиғаға) шығу туралы рапорт', ru: 'Рапорт о выезде на пожар (происшествие)' },
  docTitle: { kk: 'РАПОРТ', ru: 'РАПОРТ' },
  facts: [
    { key: 'date', required: true, label: { kk: 'Күні', ru: 'Дата' } },
    { key: 'time', required: true, label: { kk: 'Хабар түскен уақыт', ru: 'Время поступления сообщения' } },
    { key: 'place', required: true, label: { kk: 'Орны (мекенжайы)', ru: 'Место (адрес)' } },
    { key: 'object', required: true, label: { kk: 'Объект', ru: 'Объект' } },
    { key: 'unit', required: true, label: { kk: 'Бөлімше', ru: 'Подразделение' } },
    { key: 'arrivalTime', required: true, label: { kk: 'Келу уақыты', ru: 'Время прибытия' } },
    { key: 'localizationTime', required: false, label: { kk: 'Оқшаулау уақыты', ru: 'Время локализации' } },
    { key: 'liquidationTime', required: true, label: { kk: 'Жою уақыты', ru: 'Время ликвидации' } },
    { key: 'casualties', required: true, label: { kk: 'Зардап шеккендер, құтқарылғандар', ru: 'Пострадавшие, спасённые' } },
    { key: 'forces', required: false, label: { kk: 'Тартылған күштер мен құралдар', ru: 'Привлечённые силы и средства' } },
    { key: 'other', required: false, label: { kk: 'Басқа мәліметтер', ru: 'Другая информация' } },
  ],
  header: [
    { key: 'to', label: { kk: 'Кімге', ru: 'Кому' }, placeholder: { kk: 'Мысалы: №5 ӨСБ бастығына', ru: 'Например: Начальнику ПЧ-5' } },
    { key: 'from', label: { kk: 'Кімнен', ru: 'От кого' }, placeholder: { kk: 'Мысалы: күзет бастығы', ru: 'Например: начальника караула' } },
  ],
  sections: [
    {
      key: 'message',
      title: { kk: 'Хабардың түсуі', ru: 'Поступление сообщения' },
      guidance: 'Дата и время поступления сообщения, о чём сообщили, адрес и объект. Начать со слов «Докладываю, что…» («Баяндаймын, …»).',
    },
    {
      key: 'arrival',
      title: { kk: 'Келу және жағдай', ru: 'Прибытие и обстановка' },
      guidance: 'Время прибытия подразделения и обстановка на момент прибытия (что горело, где, угроза людям), результаты разведки.',
    },
    {
      key: 'actions',
      title: { kk: 'Бөлімшенің іс-әрекеті', ru: 'Действия подразделения' },
      guidance: 'Спасение и эвакуация людей, подача стволов, тушение, другие действия — в той последовательности, как в описании.',
    },
    {
      key: 'result',
      title: { kk: 'Нәтиже', ru: 'Результат' },
      guidance: 'Время локализации и ликвидации горения (происшествия).',
    },
    {
      key: 'consequences',
      title: { kk: 'Салдары', ru: 'Последствия' },
      guidance: 'Пострадавшие, погибшие, спасённые, эвакуированные; повреждения объекта, если они указаны.',
    },
    {
      key: 'forces',
      title: { kk: 'Күштер мен құралдар', ru: 'Силы и средства' },
      guidance: 'Привлечённые силы и средства: подразделения, техника, личный состав.',
    },
  ],
}
