'use client'

interface LineChartProps {
  data: Record<string, number>
  color?: string
  height?: number
}

export function LineChart({ data, color = 'rgb(59, 130, 246)', height = 300 }: LineChartProps) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    )
  }

  const values = entries.map(([, value]) => value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue || 1

  const chartHeight = height - 60
  const chartWidth = 100
  const pointSpacing = chartWidth / Math.max(entries.length - 1, 1)

  const points = entries.map(([, value], index) => {
    const x = index * pointSpacing
    const y = chartHeight - ((value - minValue) / range) * chartHeight
    return { x, y, value }
  })

  const pathData = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')

  const areaPathData = `${pathData} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`

  return (
    <div className="w-full">
      <svg
        viewBox={`-5 -5 ${chartWidth + 10} ${height}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>

        <g className="grid-lines">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </g>

        <path
          d={areaPathData}
          fill={`url(#gradient-${color})`}
        />

        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2.5"
            />
            <title>{entries[index][0]}: {point.value}</title>
          </g>
        ))}

        {entries.map(([label], index) => (
          <text
            key={index}
            x={points[index].x}
            y={height - 20}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
            className="font-medium"
          >
            {label.length > 8 ? label.substring(0, 6) + '...' : label}
          </text>
        ))}

        {[maxValue, Math.round(maxValue * 0.5)].map((value, index) => (
          <text
            key={index}
            x="-3"
            y={chartHeight * (index === 0 ? 0 : 0.5) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
            className="font-medium"
          >
            {value}
          </text>
        ))}
      </svg>
    </div>
  )
}
