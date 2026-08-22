"use client"

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import "./motion-material-design-ripple-utils/index.css"

export function MaterialDesignRipple({ children, onClick, disabled, className, ...props }) {
  const [ripples, setRipples] = useState([])
  const nextId = useRef(0)
  const buttonRef = useRef(null)

  const addRipple = useCallback((clientX, clientY) => {
    const node = buttonRef.current
    if (!node) return
    const box = node.getBoundingClientRect()
    const x = clientX - box.left
    const y = clientY - box.top
    const farthestX = Math.max(x, box.width - x)
    const farthestY = Math.max(y, box.height - y)
    const size = Math.sqrt(farthestX * farthestX + farthestY * farthestY) * 2
    const id = ++nextId.current
    setRipples((current) => [...current, { id, x, y, size }])
    return id
  }, [])

  const popRipple = useCallback(() => {
    setRipples((current) => (current.length ? current.slice(0, current.length - 1) : current))
  }, [])

  const onPointerDown = useCallback(
    (event) => {
      if (event.isPrimary) addRipple(event.clientX, event.clientY)
    },
    [addRipple],
  )

  const onKeyDown = useCallback(
    (event) => {
      if (event.repeat) return
      if (event.key !== " " && event.key !== "Enter") return
      const node = buttonRef.current
      if (!node) return
      const box = node.getBoundingClientRect()
      addRipple(box.left + box.width / 2, box.top + box.height / 2)
    },
    [addRipple],
  )

  const onKeyUp = useCallback(
    (event) => {
      if (event.key === " " || event.key === "Enter") popRipple()
    },
    [popRipple],
  )

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={`md-button ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={popRipple}
      onPointerCancel={popRipple}
      onPointerLeave={popRipple}
      onBlur={popRipple}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      whileHover={{ borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.25)" }}
      initial={{ borderColor: "rgba(239, 68, 68, 0.5)", backgroundColor: "rgba(239, 68, 68, 0.15)" }}
      transition={{ duration: 0.2, ease: "linear" }}
      {...props}
    >
      {children || "Click me"}
      <span className="ripple-container" aria-hidden>
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="ripple"
              style={{
                width: ripple.size,
                height: ripple.size,
                left: ripple.x - ripple.size / 2,
                top: ripple.y - ripple.size / 2,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.4, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </span>
    </motion.button>
  )
}

export default MaterialDesignRipple
