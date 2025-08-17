import React, { useState, useEffect, useRef } from 'react'

interface MasonryGridProps {
  children: React.ReactElement[]
  gap?: number
  minColumnWidth?: number
}

const MasonryGrid: React.FC<MasonryGridProps> = ({ 
  children, 
  gap = 16, 
  minColumnWidth = 280 
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)

  // 列数を計算
  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
        
        // 最小列幅とガップを考慮して列数を計算
        const availableWidth = width - gap
        const maxColumns = Math.floor((availableWidth + gap) / (minColumnWidth + gap))
        const newColumns = Math.max(1, maxColumns)
        
        setColumns(newColumns)
      }
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    
    return () => window.removeEventListener('resize', updateLayout)
  }, [gap, minColumnWidth])

  // アイテムを列に分散配置
  const distributeItems = () => {
    const columnArrays: React.ReactElement[][] = Array.from({ length: columns }, () => [])
    const columnHeights = new Array(columns).fill(0)

    children.forEach((child, index) => {
      // 最も短い列を見つける
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      
      // アイテムを最も短い列に追加
      columnArrays[shortestColumnIndex].push(
        React.cloneElement(child, { key: index })
      )
      
      // 列の高さを推定（実際の高さは動的なので概算）
      const estimatedHeight = 200 // 基本的なカードの高さ
      columnHeights[shortestColumnIndex] += estimatedHeight + gap
    })

    return columnArrays
  }

  const columnWidth = columns > 1 
    ? `${(containerWidth - gap * (columns - 1)) / columns}px`
    : '100%'

  const distributedItems = distributeItems()

  return (
    <div 
      ref={containerRef}
      className="w-full"
      style={{
        display: 'flex',
        gap: `${gap}px`,
        alignItems: 'flex-start'
      }}
    >
      {distributedItems.map((columnItems, columnIndex) => (
        <div
          key={columnIndex}
          style={{
            width: columnWidth,
            display: 'flex',
            flexDirection: 'column',
            gap: `${gap}px`
          }}
        >
          {columnItems}
        </div>
      ))}
    </div>
  )
}

export default MasonryGrid