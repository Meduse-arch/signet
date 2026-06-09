import { useRef } from 'react'
import { useRune } from '../../hooks/useRune'

export function RuneCanvas() {
 const containerRef = useRef<HTMLDivElement>(null)
 useRune(containerRef)

 return (
 <div
 ref={containerRef}
 className="absolute inset-0 z-0"
 />
 )
}
