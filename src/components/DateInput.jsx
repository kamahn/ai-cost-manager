export default function DateInput({ value, onChange, style }) {
  const display = value
    ? value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.')
    : ''

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      boxSizing: 'border-box',
      ...style
    }}>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          opacity: 0.01,
          cursor: 'pointer',
          fontSize: 16,
          border: 'none',
          background: 'transparent',
          zIndex: 2,
          boxSizing: 'border-box',
        }}
      />
      {/* 커스텀 표시 — 크롬 캘린더 아이콘 자리(32px) 확보 */}
      <div style={{
        width: '100%',
        padding: '8px 36px 8px 10px',
        borderRadius: 8,
        border: '1px solid #d2d2d7',
        background: '#fff',
        fontSize: 13,
        color: value ? '#1d1d1f' : '#aaa',
        boxSizing: 'border-box',
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        pointerEvents: 'none',
        position: 'relative',
        zIndex: 1,
      }}>
        {display || '날짜 선택'}
        {/* 캘린더 아이콘 표시 */}
        <span style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 14,
          color: '#aaa',
          pointerEvents: 'none',
        }}>📅</span>
      </div>
    </div>
  )
}
