import { useState, useRef, useEffect } from 'react'
import { getFaviconUrl, getDisplayName } from '../serviceIcons.js'
import { COLORS } from '../styles.js'

export default function ServiceSelect({ value, onChange, services, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sorted = [...services].sort((a, b) =>
    getDisplayName(a).localeCompare(getDisplayName(b), 'ko')
  )

  const displayName = value ? getDisplayName(value) : ''
  const faviconUrl = value ? getFaviconUrl(value) : null

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* 선택 버튼 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: `1px solid ${open ? COLORS.primary : '#d2d2d7'}`, background: '#fff', cursor: 'pointer', fontSize: 13, minHeight: 36 }}>
        {faviconUrl && (
          <img src={faviconUrl} width={16} height={16} style={{ borderRadius: 3, flexShrink: 0 }}
            onError={e => e.target.style.display = 'none'} alt="" />
        )}
        <span style={{ flex: 1, color: value ? COLORS.text : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName || '서비스 선택'}
        </span>
        <span style={{ fontSize: 10, color: COLORS.textSecondary, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* 드롭다운 목록 */}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #d2d2d7', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto', marginTop: 4 }}>
          <div
            onClick={() => { onChange(''); setOpen(false) }}
            style={{ padding: '10px 12px', fontSize: 13, color: '#aaa', cursor: 'pointer', borderBottom: '1px solid #f5f5f7' }}>
            선택 안 함
          </div>
          {sorted.map(s => {
            const name = getDisplayName(s)
            const favicon = getFaviconUrl(s)
            const isSelected = value === s
            return (
              <div key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', fontSize: 13, cursor: 'pointer', background: isSelected ? COLORS.primaryLight : '#fff', color: isSelected ? COLORS.primary : COLORS.text, borderBottom: '1px solid #f5f5f7' }}>
                {favicon ? (
                  <img src={favicon} width={18} height={18} style={{ borderRadius: 4, flexShrink: 0 }}
                    onError={e => { e.target.style.display='none' }} alt="" />
                ) : (
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
