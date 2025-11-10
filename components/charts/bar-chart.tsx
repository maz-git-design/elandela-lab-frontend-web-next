'use client'

interface BarChartProps {
  data: Record<string, number>
  color?: string
  height?: number
}

export function BarChart({ data, color = 'rgb(59, 130, 246)', height = 300 }: BarChartProps) {
  const entries = Object.entries(data).slice(0, 10)
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    )
  }

  const maxValue = Math.max(...entries.map(([, value]) => value), 1)

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-700 truncate flex-1 font-medium">{key}</span>
            <span className="font-bold text-gray-900 ml-2">{value}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(value / maxValue) * 100}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
