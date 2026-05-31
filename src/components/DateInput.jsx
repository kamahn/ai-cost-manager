import { useRef } from 'react'

export default function DateInput({ value, onChange, style }) {
  const inputRef = useRef(null)

  const display = value
    ? value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.')
    : ''

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {/* 보이는 UI */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid #d2d2d7',
          fontSize: 13,
          background: '#fff',
          boxSizing: 'border-box',
          cursor: 'pointer',
          color: value ? '#1d1d1f' : '#aaa',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
        }}>
        {display || '날짜 선택'}
      </div>
      {/* 실제 input - 투명하게 위에 올려서 클릭 이벤트 직접 받음 */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontSize: 16,
          zIndex: 1,
        }}
      />
    </div>
  )
}
