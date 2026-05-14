import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';

export interface PinDataPoint {
  label: string;
  value: string | number;
  unit?: string;
}

export interface PinStyleConfig {
  backgroundColor?: string;
  backgroundOpacity?: number;
  textColor?: string;
  borderColor?: string;
  borderOpacity?: number;
  borderWidth?: number;
  borderRadius?: number;
  scale?: number;
  backdropBlur?: number;
  showLabel?: boolean;
  showAnchor?: boolean;
  displayAttributes?: string[];
  xOffset?: number | string;
  yOffset?: number | string;
  bubbleXOffset?: number | string;
  bubbleYOffset?: number | string;
  customLabel?: string;
  valueMapJson?: string;
  viewId?: string; // Legacy: If set, pin is ONLY visible when this view is active
  viewIds?: string[]; // If set, pin is ONLY visible when one of these views is active
  clickAction?: 'toggle' | 'more-info' | 'none';
  attributeUnits?: Record<string, string>;
}

export interface PinProps {
  x: number;
  y: number;
  visible?: boolean;
  label?: string;
  points?: PinDataPoint[];
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onUpdateConfig?: (updates: Partial<PinStyleConfig>) => void;
  styleConfig?: PinStyleConfig;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '15, 23, 42';
};

export const Pin: React.FC<PinProps> = ({
  x,
  y,
  visible = true,
  label,
  points = [],
  onClick,
  onContextMenu,
  onUpdateConfig,
  styleConfig = {},
}) => {
  const longPressDelay = useStore(state => state.longPressDelay);
  const [shouldRender, setShouldRender] = useState(visible);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleSize, setBubbleSize] = useState({ w: 0, h: 0 });

  // Drag-and-drop state
  const [dragMode, setDragMode] = useState<'none' | 'bubble' | 'anchor'>('none');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasDragging = useRef(false);
  const preventClick = useRef(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Measure bubble once on mount and when content changes
  useEffect(() => {
    if (!bubbleRef.current || !shouldRender) return;
    // Initial measurement
    const el = bubbleRef.current;
    setBubbleSize(prev => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (prev.w === w && prev.h === h) return prev;
      return { w, h };
    });

    // ResizeObserver for dynamic content changes only
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        setBubbleSize(prev => {
          const w = target.offsetWidth;
          const h = target.offsetHeight;
          if (prev.w === w && prev.h === h) return prev;
          return { w, h };
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, label, points.length]);

  useEffect(() => {
    return () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (anchorTimer.current) clearTimeout(anchorTimer.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wasDragging.current = false;
    preventClick.current = false;
    
    // Start timers for dual drag mode
    bubbleTimer.current = setTimeout(() => {
      setDragMode('bubble');
      setDragOffset({ x: 0, y: 0 });
    }, longPressDelay);
    
    anchorTimer.current = setTimeout(() => {
      setDragMode('anchor');
    }, longPressDelay * 2);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'none') {
      // If we move too much before the timer triggers, cancel the long press
      if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5) {
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
        if (anchorTimer.current) clearTimeout(anchorTimer.current);
      }
      return;
    }

    e.stopPropagation();
    wasDragging.current = true;
    
    // If they start moving the bubble, cancel the anchor timer so it doesn't upgrade mid-drag
    if (anchorTimer.current) {
      clearTimeout(anchorTimer.current);
      anchorTimer.current = null;
    }

    setDragOffset(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    if (anchorTimer.current) clearTimeout(anchorTimer.current);
    
    if (dragMode !== 'none') {
      preventClick.current = true;
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      if (onUpdateConfig) {
        if (dragMode === 'bubble') {
          const currentBubbleX = typeof styleConfig.bubbleXOffset === 'string' ? parseFloat(styleConfig.bubbleXOffset) || 0 : (styleConfig.bubbleXOffset ?? 0);
          const currentBubbleY = typeof styleConfig.bubbleYOffset === 'string' ? parseFloat(styleConfig.bubbleYOffset) || 0 : (styleConfig.bubbleYOffset ?? -20);
          onUpdateConfig({
            bubbleXOffset: currentBubbleX + dragOffset.x,
            bubbleYOffset: currentBubbleY + dragOffset.y,
          });
        } else if (dragMode === 'anchor') {
          const currentX = typeof styleConfig.xOffset === 'string' ? parseFloat(styleConfig.xOffset) || 0 : (styleConfig.xOffset ?? 0);
          const currentY = typeof styleConfig.yOffset === 'string' ? parseFloat(styleConfig.yOffset) || 0 : (styleConfig.yOffset ?? 0);
          onUpdateConfig({
            xOffset: currentX + dragOffset.x,
            yOffset: currentY + dragOffset.y,
          });
        }
      }
      
      setDragMode('none');
      setDragOffset({ x: 0, y: 0 });
      // We do NOT reset wasDragging.current here, so onClick can read it.
      // It will be reset on the next pointerdown.
    }
  };

  if (!shouldRender) return null;

  const {
    backgroundColor = '#0f172a',
    backgroundOpacity = 0.65,
    textColor = '#ffffff',
    borderColor = '#ffffff',
    borderOpacity = 0.15,
    borderWidth = 1,
    borderRadius = 16,
    scale = 1,
    backdropBlur = 12,
    showLabel = true,
    showAnchor = true,
    xOffset = 0,
    yOffset = 0,
    bubbleXOffset = 0,
    bubbleYOffset = -20,
  } = styleConfig;

  const bgRgba = backgroundColor.startsWith('#') ? `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity})` : backgroundColor;
  const borderRgba = borderColor.startsWith('#') ? `rgba(${hexToRgb(borderColor)}, ${borderOpacity})` : borderColor;

  const parsedXOffset = typeof xOffset === 'string' ? (parseFloat(xOffset) || 0) : xOffset;
  const parsedYOffset = typeof yOffset === 'string' ? (parseFloat(yOffset) || 0) : yOffset;
  const parsedBubbleX = typeof bubbleXOffset === 'string' ? (parseFloat(bubbleXOffset) || 0) : bubbleXOffset;
  const parsedBubbleY = typeof bubbleYOffset === 'string' ? (parseFloat(bubbleYOffset) || 0) : bubbleYOffset;

  const currentScale = visible ? scale : scale * 0.95;

  // Add dragOffset conditionally
  const effectiveBubbleX = parsedBubbleX + (dragMode === 'bubble' ? dragOffset.x : 0);
  const effectiveBubbleY = parsedBubbleY + (dragMode === 'bubble' ? dragOffset.y : 0);
  
  const effectiveXOffset = parsedXOffset + (dragMode === 'anchor' ? dragOffset.x : 0);
  const effectiveYOffset = parsedYOffset + (dragMode === 'anchor' ? dragOffset.y : 0);

  // Calculate the exact unscaled center of the bubble
  const cx = effectiveBubbleX;
  const cy = effectiveBubbleY - (bubbleSize.h / 2);
  
  // Scaled dimensions of the bubble
  const w = bubbleSize.w * currentScale;
  const h = bubbleSize.h * currentScale;

  // Vector from the center of the bubble to the anchor (0,0)
  const dx = -cx;
  const dy = -cy;

  let px = cx;
  let py = cy;

  if (w > 0 && h > 0) {
    const targetW = Math.max(0, w - 2);
    const targetH = Math.max(0, h - 2);
    const tx = dx !== 0 ? Math.abs((targetW / 2) / dx) : Infinity;
    const ty = dy !== 0 ? Math.abs((targetH / 2) / dy) : Infinity;
    const t = Math.min(tx, ty);
    if (t < 1) {
      px = cx + t * dx;
      py = cy + t * dy;
    } else {
      px = 0;
      py = 0;
    }
  } else {
    px = effectiveBubbleX;
    py = effectiveBubbleY;
  }

  return (
    <div
      className={`absolute z-50 pointer-events-none transition-all ease-[cubic-bezier(0.23,1,0.32,1)] ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${dragMode === 'none' ? 'duration-300' : 'duration-0'}`}
      style={{
        left: `${x + effectiveXOffset}px`,
        top: `${y + effectiveYOffset}px`,
      }}
    >
      {/* SVG Connecting Line */}
      {showAnchor && (
        <svg 
          className="absolute left-0 top-0 pointer-events-none z-0" 
          width="1" 
          height="1" 
          style={{ overflow: 'visible' }}
        >
           <line 
             x1={0} 
             y1={0} 
             x2={px} 
             y2={py} 
             stroke={borderRgba}
             strokeWidth="1.5"
             strokeDasharray="2 2"
           />
        </svg>
      )}

      {/* Anchor at exactly 0,0 — replaced animate-ping with a finite gentle pulse */}
      {showAnchor && (
        <div className={`absolute left-0 top-0 flex items-center justify-center pointer-events-none z-0 transition-transform ${dragMode === 'anchor' ? 'scale-150' : 'scale-100'}`} style={{ transform: 'translate(-50%, -50%)' }}>
          <div className="absolute w-5 h-5 bg-white/20 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
          <div className="relative w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]"></div>
        </div>
      )}

      {/* The Bubble */}
      <div 
        ref={bubbleRef}
        className={`absolute pointer-events-auto cursor-pointer group flex flex-col items-center z-10 transition-transform ${dragMode === 'none' ? 'duration-300' : 'duration-0'} ${dragMode === 'bubble' ? 'scale-105 shadow-2xl' : ''}`}
        style={{
          left: `${effectiveBubbleX}px`,
          top: `${effectiveBubbleY}px`,
          transform: `translate(-50%, -100%) scale(${currentScale})`, 
          touchAction: 'none' // Prevent scrolling when dragging on touch devices
        }}
        onClick={(e) => {
          if (dragMode !== 'none' || preventClick.current || wasDragging.current) {
            e.stopPropagation();
            return;
          }
          if (onClick) onClick(e);
        }}
        onContextMenu={onContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="relative overflow-hidden shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1.5 group-active:scale-95 group-active:translate-y-0"
          style={{
            backgroundColor: bgRgba,
            color: textColor,
            borderColor: borderRgba,
            borderWidth: `${borderWidth}px`,
            borderStyle: 'solid',
            borderRadius: `${borderRadius}px`,
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {/* Subtle top glare effect for premium glass look */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10"></div>
          
          {/* Subtle background highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none"></div>

          <div className="relative z-10">
            {/* Label Header */}
            {showLabel && label && (
              <div className="px-5 py-2.5 border-b border-white/10 bg-black/10">
                <h3 className="text-sm font-semibold tracking-wide opacity-95 drop-shadow-md whitespace-nowrap">
                  {label}
                </h3>
              </div>
            )}

            {/* Data Points */}
            {points.length > 0 && (
              <div className="p-4 flex flex-col gap-2.5 min-w-[160px]">
                {points.map((pt, i) => (
                  <div key={i} className="flex justify-between items-center gap-5">
                    <span className="text-xs font-medium opacity-60 tracking-wider uppercase whitespace-nowrap">
                      {pt.label}
                    </span>
                    <span className="font-mono text-base font-bold drop-shadow-sm flex items-baseline gap-1">
                      {pt.value}
                      {pt.unit && (
                        <span className="text-xs font-semibold opacity-50">
                          {pt.unit}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty state padding if no label or points but component rendered */}
            {(!showLabel || !label) && points.length === 0 && (
              <div className="p-4 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white/50"></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
