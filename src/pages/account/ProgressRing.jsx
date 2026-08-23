function ProgressRing({ percent, mastered, total, label, tooltipMastered, tooltipRemaining, tooltipProgress }) {
  const size = 168
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference
  const remaining = Math.max(total - mastered, 0)

  return (
    <div className="progress-ring-wrap">
      <svg
        className="progress-ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${tooltipProgress} ${tooltipMastered} ${tooltipRemaining}`}
      >
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-center">
        <span className="progress-ring-percent">{percent}%</span>
        <span className="progress-ring-fraction">
          {mastered} / {total}
        </span>
        <span className="progress-ring-label">{label}</span>
      </div>
      <div className="progress-ring-tooltip" role="tooltip">
        <span>{tooltipMastered}</span>
        <span>{tooltipRemaining}</span>
        <span>{tooltipProgress}</span>
      </div>
    </div>
  )
}

export default ProgressRing
