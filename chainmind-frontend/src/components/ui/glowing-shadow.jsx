"use client"

import React from "react"
import "./glowing-shadow-utils/index.css"

export function GlowingShadow({ children, alwaysActive = false, className = "", style = {} }) {
  return (
    <div 
      className={`glow-container ${alwaysActive ? "always-active" : ""} ${className}`} 
      style={style}
    >
      <span className="glow"></span>
      <div className="glow-content">{children}</div>
    </div>
  )
}

export default GlowingShadow
