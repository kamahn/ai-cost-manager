import { useRef, useState } from 'react'

export default function DateInput({ value, onChange, style }) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)

  const display = value
    ? value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.')
    : ''

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {/* 실제 date input을 그대로 보여주되 커스텀 스타일 적용 */}
      <div style={{ position: 'relative' }}>
        {/* 커스텀 표시 레이어 (포커스 없을 때만 표시) */}
        {!focused && (
          <div
            onClick={() => {
              setFocused(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center',
              padding: '8px 10px',
              fontSize: 13,
              color: value ? '#1d1d1f' : '#aaa',
              cursor: 'pointer',
              zIndex: 2,
              background: '#fff',
              borderRadius: 8,
              boxSizing: 'border-box',
              userSelect: 'none',
            }}>
            {display || '날짜 선택'}
          </div>
        )}
        {/* 실제 input - 항상 렌더링, 포커스 시 보임 */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: `1px solid ${focused ? '#7F77DD' : '#d2d2d7'}`,
            fontSize: 13,
            background: '#fff',
            boxSizing: 'border-box',
            cursor: 'pointer',
            outline: 'none',
            colorScheme: 'light',
          }}
        />
      </div>
    </div>
  )
}
