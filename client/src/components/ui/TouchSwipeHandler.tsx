import * as React from "react"
import { cn } from "@shared"
import { Trash2, Edit3, RotateCcw } from "lucide-react"

interface SwipeAction {
  id: string
  icon: React.ReactNode
  label: string
  color: string
  backgroundColor: string
  threshold: number
  onTrigger: () => void
}

interface TouchSwipeHandlerProps {
  children: React.ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  className?: string
  disabled?: boolean
  sensitivity?: number
  threshold?: number
}

interface TouchState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
  direction: 'left' | 'right' | null
  hasTriggered: boolean
}

export function TouchSwipeHandler({
  children,
  leftAction,
  rightAction,
  className,
  disabled = false,
  sensitivity = 0.3,
  threshold = 80
}: TouchSwipeHandlerProps) {
  const [touchState, setTouchState] = React.useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    direction: null,
    hasTriggered: false
  })

  const containerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [showKeyboardHint, setShowKeyboardHint] = React.useState(false)

  const resetState = () => {
    setTouchState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      direction: null,
      hasTriggered: false
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return

    const touch = e.touches[0]
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: true,
      direction: null,
      hasTriggered: false
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchState.isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchState.startX
    const deltaY = touch.clientY - touchState.startY

    // Determine if this is a horizontal swipe (ignore vertical scrolling)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2

    if (!isHorizontalSwipe) {
      resetState()
      return
    }

    // Prevent vertical scrolling during horizontal swipe
    e.preventDefault()

    const direction = deltaX > 0 ? 'right' : 'left'
    const absDistance = Math.abs(deltaX)
    
    // Apply sensitivity to the movement
    const adjustedDelta = deltaX * sensitivity

    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction
    }))

    // Apply transform to content
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${adjustedDelta}px)`
      contentRef.current.style.transition = 'none'
    }

    // Show action indicators based on swipe direction and distance
    updateActionIndicators(direction, absDistance)
  }

  const updateActionIndicators = (direction: 'left' | 'right', distance: number) => {
    const action = direction === 'left' ? leftAction : rightAction
    if (!action) return

    const progress = Math.min(distance / threshold, 1)
    const shouldActivate = distance >= threshold

    // Update container background color
    if (containerRef.current) {
      const opacity = Math.min(progress * 0.8, 0.6)
      containerRef.current.style.backgroundColor = shouldActivate 
        ? action.backgroundColor
        : `${action.backgroundColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
    }
  }

  const handleTouchEnd = () => {
    if (disabled || !touchState.isDragging) return

    const deltaX = touchState.currentX - touchState.startX
    const absDistance = Math.abs(deltaX)
    const direction = deltaX > 0 ? 'right' : 'left'

    // Determine if action should be triggered
    const action = direction === 'left' ? leftAction : rightAction
    const shouldTrigger = action && absDistance >= threshold

    if (shouldTrigger && !touchState.hasTriggered) {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }

      // Trigger the action
      action.onTrigger()
      
      setTouchState(prev => ({ ...prev, hasTriggered: true }))
    }

    // Reset visual state
    if (contentRef.current) {
      contentRef.current.style.transform = 'translateX(0)'
      contentRef.current.style.transition = 'transform 0.2s ease-out'
    }

    if (containerRef.current) {
      containerRef.current.style.backgroundColor = 'transparent'
    }

    // Reset touch state after animation
    setTimeout(resetState, 200)
  }

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    // Handle keyboard shortcuts for actions
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (leftAction) {
        e.preventDefault()
        leftAction.onTrigger()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (rightAction) {
        e.preventDefault()
        rightAction.onTrigger()
      }
    } else if (e.key === 'ArrowLeft') {
      if (leftAction) {
        e.preventDefault()
        // Show visual feedback for left action
        setShowKeyboardHint(true)
        setTimeout(() => setShowKeyboardHint(false), 1000)
      }
    } else if (e.key === 'ArrowRight') {
      if (rightAction) {
        e.preventDefault()
        // Show visual feedback for right action
        setShowKeyboardHint(true)
        setTimeout(() => setShowKeyboardHint(false), 1000)
      }
    }
  }

  const handleFocus = () => {
    setShowKeyboardHint(true)
    setTimeout(() => setShowKeyboardHint(false), 2000)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return

    setTouchState({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: true,
      direction: null,
      hasTriggered: false
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !touchState.isDragging) return

    const deltaX = e.clientX - touchState.startX
    const deltaY = e.clientY - touchState.startY

    // Determine if this is a horizontal swipe
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2

    if (!isHorizontalSwipe) {
      resetState()
      return
    }

    const direction = deltaX > 0 ? 'right' : 'left'
    const absDistance = Math.abs(deltaX)
    const adjustedDelta = deltaX * sensitivity

    setTouchState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
      direction
    }))

    // Apply transform to content
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${adjustedDelta}px)`
      contentRef.current.style.transition = 'none'
    }

    updateActionIndicators(direction, absDistance)
  }

  const handleMouseUp = () => {
    if (disabled || !touchState.isDragging) return

    const deltaX = touchState.currentX - touchState.startX
    const absDistance = Math.abs(deltaX)
    const direction = deltaX > 0 ? 'right' : 'left'

    const action = direction === 'left' ? leftAction : rightAction
    const shouldTrigger = action && absDistance >= threshold

    if (shouldTrigger && !touchState.hasTriggered) {
      action.onTrigger()
      setTouchState(prev => ({ ...prev, hasTriggered: true }))
    }

    // Reset visual state
    if (contentRef.current) {
      contentRef.current.style.transform = 'translateX(0)'
      contentRef.current.style.transition = 'transform 0.2s ease-out'
    }

    if (containerRef.current) {
      containerRef.current.style.backgroundColor = 'transparent'
    }

    setTimeout(resetState, 200)
  }

  // Add mouse event listeners when dragging
  React.useEffect(() => {
    if (touchState.isDragging && !disabled) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!touchState.isDragging) return

        const deltaX = e.clientX - touchState.startX
        const deltaY = e.clientY - touchState.startY
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2

        if (!isHorizontalSwipe) {
          resetState()
          return
        }

        const direction = deltaX > 0 ? 'right' : 'left'
        const absDistance = Math.abs(deltaX)
        const adjustedDelta = deltaX * sensitivity

        setTouchState(prev => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
          direction
        }))

        if (contentRef.current) {
          contentRef.current.style.transform = `translateX(${adjustedDelta}px)`
          contentRef.current.style.transition = 'none'
        }

        updateActionIndicators(direction, absDistance)
      }

      const handleGlobalMouseUp = () => {
        handleMouseUp()
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [touchState.isDragging, touchState.startX, touchState.startY, disabled])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden transition-colors duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 rounded-lg",
        touchState.isDragging && "select-none",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      tabIndex={0}
      role="button"
      aria-label={`Swipe card. ${leftAction ? `Swipe left or press Delete to ${leftAction.label.toLowerCase()}` : ''}${leftAction && rightAction ? ', ' : ''}${rightAction ? `Swipe right or press Enter to ${rightAction.label.toLowerCase()}` : ''}`}
    >
      {/* Left Action Indicator */}
      {leftAction && (
        <div className="absolute left-0 top-0 h-full w-20 flex items-center justify-center z-10 pointer-events-none">
          <div className={cn(
            "flex flex-col items-center gap-1 transition-all duration-200",
            (touchState.direction === 'left' && Math.abs(touchState.currentX - touchState.startX) >= threshold) || showKeyboardHint
              ? "opacity-100 scale-110"
              : "opacity-0 scale-90"
          )}>
            <div className={cn(
              "p-2 rounded-full",
              leftAction.color
            )}>
              {leftAction.icon}
            </div>
            <span className="text-xs font-medium text-white">
              {leftAction.label}
            </span>
            {showKeyboardHint && (
              <span className="text-xs text-white/80 mt-1">
                Press Delete
              </span>
            )}
          </div>
        </div>
      )}

      {/* Right Action Indicator */}
      {rightAction && (
        <div className="absolute right-0 top-0 h-full w-20 flex items-center justify-center z-10 pointer-events-none">
          <div className={cn(
            "flex flex-col items-center gap-1 transition-all duration-200",
            (touchState.direction === 'right' && Math.abs(touchState.currentX - touchState.startX) >= threshold) || showKeyboardHint
              ? "opacity-100 scale-110"
              : "opacity-0 scale-90"
          )}>
            <div className={cn(
              "p-2 rounded-full",
              rightAction.color
            )}>
              {rightAction.icon}
            </div>
            <span className="text-xs font-medium text-white">
              {rightAction.label}
            </span>
            {showKeyboardHint && (
              <span className="text-xs text-white/80 mt-1">
                Press Enter
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-20 bg-white transition-transform duration-200 ease-out"
        style={{ transform: 'translateX(0)' }}
      >
        {children}
      </div>
    </div>
  )
}

// Pre-configured action helpers for common use cases
export const createDeleteAction = (onDelete: () => void): SwipeAction => ({
  id: 'delete',
  icon: <Trash2 className="h-4 w-4" />,
  label: 'Delete',
  color: 'text-white',
  backgroundColor: 'rgb(239, 68, 68)', // red-500
  threshold: 80,
  onTrigger: onDelete
})

export const createEditAction = (onEdit: () => void): SwipeAction => ({
  id: 'edit',
  icon: <Edit3 className="h-4 w-4" />,
  label: 'Edit',
  color: 'text-white',
  backgroundColor: 'rgb(59, 130, 246)', // blue-500
  threshold: 80,
  onTrigger: onEdit
})

export const createUndoAction = (onUndo: () => void): SwipeAction => ({
  id: 'undo',
  icon: <RotateCcw className="h-4 w-4" />,
  label: 'Undo',
  color: 'text-white',
  backgroundColor: 'rgb(168, 85, 247)', // purple-500
  threshold: 80,
  onTrigger: onUndo
})