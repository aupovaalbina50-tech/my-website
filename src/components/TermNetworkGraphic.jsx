// Decorative constellation of civil-defense terms for the Hero's right side.
// Positions are pre-computed percentages on a 100x100 square so the SVG
// connector lines and the absolutely-positioned HTML node labels always
// line up, regardless of the container's rendered size.
const PRIMARY_POSITIONS = [
  { x: 50, y: 16, label: 'below' },
  { x: 82.3, y: 39.5, label: 'below' },
  { x: 70, y: 77.5, label: 'below' },
  { x: 30, y: 77.5, label: 'below' },
  { x: 17.7, y: 39.5, label: 'below' },
]

const SECONDARY_POSITIONS = [
  { x: 77, y: 12.8, label: 'below' },
  { x: 50, y: 96, label: 'above' },
  { x: 23, y: 12.8, label: 'below' },
]

function TermNetworkGraphic({ labels }) {
  const primary = PRIMARY_POSITIONS.map((pos, i) => ({ ...pos, text: labels.nodes[i] }))
  const secondary = SECONDARY_POSITIONS.map((pos, i) => ({ ...pos, text: labels.minor[i] }))

  return (
    <div className="term-network" role="img" aria-label={labels.center}>
      <svg className="term-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {primary.map((n, i) => (
          <g key={n.text} style={{ '--line-delay': `${0.5 + i * 0.12}s`, '--pulse-delay': `${i * 1.6}s` }}>
            <line x1="50" y1="50" x2={n.x} y2={n.y} className="term-network-line" />
            <line x1="50" y1="50" x2={n.x} y2={n.y} className="term-network-line-pulse" />
          </g>
        ))}
      </svg>

      <div className="term-network-node term-network-node-center" style={{ left: '50%', top: '50%' }}>
        <span className="term-network-node-inner">
          <span className="term-network-dot term-network-dot-center" aria-hidden="true" />
          <span className="term-network-label term-network-label-center">{labels.center}</span>
        </span>
      </div>

      {primary.map((n, i) => (
        <div
          key={n.text}
          className={`term-network-node term-network-node-primary term-network-label-${n.label}`}
          style={{ left: `${n.x}%`, top: `${n.y}%`, '--node-delay': `${0.75 + i * 0.1}s` }}
        >
          <span className="term-network-node-inner">
            <span className="term-network-dot" aria-hidden="true" />
            <span className="term-network-label">{n.text}</span>
          </span>
        </div>
      ))}

      {secondary.map((n, i) => (
        <div
          key={n.text}
          className={`term-network-node term-network-node-minor term-network-label-${n.label}`}
          style={{ left: `${n.x}%`, top: `${n.y}%`, '--node-delay': `${1.25 + i * 0.1}s` }}
        >
          <span className="term-network-node-inner">
            <span className="term-network-dot" aria-hidden="true" />
            <span className="term-network-label">{n.text}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export default TermNetworkGraphic
