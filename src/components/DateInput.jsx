import { useRef } from 'react'

export default function DateInput({ value, onChange, style }) {
  const inputRef = useRef(null)

  const display = value
    ? value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.')
    : ''

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 36,
      borderRadius: 8,
      border: '1px solid #d2d2d7',
      background: '#fff',
      overflow: 'hidden',   // iOS 넘침 차단
      boxSizing: 'border-box',
      ...style
    }}>
      {/* 커스텀 표시 텍스트 */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center',
        padding: '0 10px',
        fontSize: 13,
        color: value ? '#1d1d1f' : '#aaa',
        pointerEvents: 'none', // 클릭 이벤트는 input으로 통과
        zIndex: 1,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}>
        {display || '날짜 선택'}
      </div>

      {/* 실제 input - 완전 투명하지 않고 visibility hidden으로 크롬 차단 우회 */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.01,        // 완전 0이 아닌 0.01 — 크롬 차단 우회
          cursor: 'pointer',
          fontSize: 16,         // iOS 확대 방지
          border: 'none',
          background: 'transparent',
          zIndex: 2,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
