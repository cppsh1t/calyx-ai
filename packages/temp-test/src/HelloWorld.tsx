/** @jsxImportSource react */
import type { FC } from 'react'

export interface HelloWorldProps {
  name?: string
}

export const HelloWorld: FC<HelloWorldProps> = ({ name = 'World' }) => {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f0f0f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ color: '#333', margin: '0 0 10px 0' }}>Hello, {name}!</h1>
      <p style={{ color: '#666', margin: 0 }}>This is a minimal React library component.</p>
    </div>
  )
}

export default HelloWorld
