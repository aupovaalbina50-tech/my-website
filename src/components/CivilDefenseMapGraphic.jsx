// Kazakhstan's real border, simplified from public boundary data
// (johan/world.geo.json) and projected with an equirectangular
// (cos-latitude-corrected) projection into a 0-200 x 0-100 box.
const MAP_OUTLINE =
  'M116.8,85.2 L114.4,86.3 L109.0,90.6 L107.1,95.0 L105.6,95.0 L104.5,92.1 L99.2,91.9 L98.3,86.9 ' +
  'L96.3,86.9 L96.6,80.7 L91.6,76.3 L84.5,76.7 L79.6,77.6 L75.7,72.1 L72.3,69.8 L65.8,65.4 L65.1,64.9 ' +
  'L54.4,68.5 L54.5,91.0 L52.4,91.3 L49.5,86.6 L46.7,84.8 L42.0,86.1 L40.1,88.1 L39.9,86.7 L40.9,84.1 ' +
  'L40.1,82.0 L35.3,79.9 L33.5,74.4 L31.2,72.9 L31.0,70.9 L35.1,71.4 L35.2,67.0 L38.8,66.0 L42.4,66.9 ' +
  'L43.1,60.9 L42.4,57.2 L38.2,57.5 L34.7,56.0 L29.9,58.6 L26.0,59.9 L23.9,58.9 L24.3,55.8 L21.7,51.7 ' +
  'L18.6,51.9 L15.1,47.7 L17.5,43.1 L16.3,41.9 L19.6,35.1 L23.8,38.7 L24.4,34.2 L32.9,27.6 L39.4,27.4 ' +
  'L48.6,31.6 L53.5,34.1 L57.9,31.5 L64.5,31.4 L69.8,34.6 L71.0,32.8 L76.8,33.0 L77.9,30.1 L71.2,25.9 ' +
  'L75.1,23.0 L74.4,21.3 L78.3,19.7 L75.3,15.5 L77.3,13.4 L92.8,11.3 L94.8,9.8 L105.2,7.5 L109.0,5.0 ' +
  'L116.4,6.3 L117.7,12.7 L122.1,11.2 L127.4,13.3 L127.0,16.6 L131.0,16.2 L141.4,10.5 L139.9,12.4 ' +
  'L145.2,17.1 L154.5,32.6 L156.7,29.4 L162.4,33.0 L168.4,31.4 L170.7,32.5 L172.7,36.0 L175.6,37.2 ' +
  'L177.4,39.8 L182.7,39.0 L184.9,42.7 L181.8,46.8 L178.3,47.4 L178.1,53.5 L175.8,56.3 L167.6,54.2 ' +
  'L164.6,65.2 L162.4,66.5 L154.2,69.0 L158.0,79.6 L155.1,81.2 L155.4,84.7 L152.9,83.8 L150.8,81.6 ' +
  'L144.6,81.0 L137.7,80.8 L136.2,81.5 L130.3,78.9 L128.0,80.2 L127.3,83.8 L120.5,81.7 L117.7,82.5 Z'

// Lake Balkhash, roughly where it sits inside the real outline above.
const LAKE_PATH = 'M126.9,58.1 Q137.7,54 151.0,62.4 Q137.7,68 126.9,58.1 Z'

function CivilDefenseMapGraphic({ centerLabel }) {
  return (
    <div className="kzmap" role="img" aria-label={centerLabel}>
      <p className="kzmap-tag kzmap-tag-top">CIVIL PROTECTION</p>

      <svg className="kzmap-outline" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={MAP_OUTLINE} className="kzmap-outline-fill" />
        <path d={LAKE_PATH} className="kzmap-lake" />
        <path d={MAP_OUTLINE} className="kzmap-outline-stroke" />
      </svg>

      <p className="kzmap-tag kzmap-tag-online">
        <span className="kzmap-tag-dot" aria-hidden="true" />
        SYSTEM ONLINE
      </p>
      <p className="kzmap-tag kzmap-tag-langs">KZ / RU / EN</p>
    </div>
  )
}

export default CivilDefenseMapGraphic
