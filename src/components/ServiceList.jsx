import { useState } from 'react'
import { COLORS } from '../styles.js'
import { addService, renameService, deleteService } from '../sheets.js'
import { getDisplayName } from '../serviceIcons.js'
import ServiceIcon from './ServiceIcon.jsx'

export default function ServiceList({ services, onRefresh }) {
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sorted = [...services].sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'ko'))
  const filtered = sorted.filter(s => !search || getDisplayName(s).toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setNewName(''); setError(''); setShowAddForm(true) }
  const closeAdd = () => { setShowAddForm(false); setNewName(''); setError('') }

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    if (services.some(s => s.toLowerCase() === name.toLowerCase())) {
      setError('이미 있는 서비스명입니다')
      return
    }
    setSaving(true)
    try {
      await addService(name)
      closeAdd(); onRefresh()
    } finally { setSaving(false) }
  }

  const openEdit = (name) => { setEditing(name); setEditValue(name); setError('') }
  const closeEdit = () => { setEditing(null); setEditValue(''); setError('') }

  const saveEdit = async () => {
    const name = editValue.trim()
    if (!name || name === editing) { closeEdit(); return }
    if (services.some(s => s.toLowerCase() === name.toLowerCase())) {
      setError('이미 있는 서비스명입니다')
      return
    }
    setSaving(true)
    try {
      await renameService(editing, name)
      closeEdit(); onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (name) => {
    if (!window.confirm(`"${getDisplayName(name)}" 서비스를 목록에서 삭제할까요?\n(이미 기록된 결제내역/구독 내역은 그대로 유지됩니다)`)) return
    await deleteService(name); onRefresh()
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="서비스명 검색..." />
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
      </div>

      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
        {filtered.length}개 서비스
      </div>

      {showAddForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>서비스 추가</div>
          <input
            value={newName}
            onChange={e => { setNewName(e.target.value); setError('') }}
            placeholder="서비스명 (예: Midjourney)"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && add()}
            autoFocus
          />
          {error && <div style={{ fontSize: 12, color: '#E24B4A', marginTop: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={add} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={closeAdd} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>
          {search ? '검색 결과가 없습니다' : '등록된 서비스가 없습니다'}
        </div>
      ) : filtered.map(name => {
        const isEditing = editing === name
        const displayName = getDisplayName(name)
        const hasAlias = displayName !== name

        if (isEditing) {
          return (
            <div key={name} style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>서비스명 수정</div>
              <input
                value={editValue}
                onChange={e => { setEditValue(e.target.value); setError('') }}
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
              {error && <div style={{ fontSize: 12, color: '#E24B4A', marginTop: 6 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={saveEdit} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? '저장 중...' : '수정 완료'}
                </button>
                <button onClick={closeEdit} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
              </div>
            </div>
          )
        }

        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', marginBottom: 8, padding: '10px 14px' }}>
            <ServiceIcon serviceName={name} size={22} showName={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              {hasAlias && <div style={{ fontSize: 11, color: COLORS.textSecondary }}>원본: {name}</div>}
            </div>
            <button onClick={() => openEdit(name)} style={{ padding: '6px 10px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer', flexShrink: 0 }}>수정</button>
            <button onClick={() => remove(name)} style={{ padding: '6px 10px', background: '#FFF0F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#E24B4A', cursor: 'pointer', flexShrink: 0 }}>삭제</button>
          </div>
        )
      })}
    </div>
  )
}

function SearchBar({ value, onChange, placeholder = '검색...' }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#d2d2d7', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 10, color: '#fff', lineHeight: 1 }}>
          ✕
        </button>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff', boxSizing: 'border-box' }
