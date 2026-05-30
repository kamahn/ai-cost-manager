import { useState } from 'react'
import { COLORS, PROJECT_STATUS_COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW, addProject, updateProject, deleteProject } from '../sheets.js'
import ServiceIcon from './ServiceIcon.jsx'

const STATUS_LIST = ['진행중', '완료', '정산완료']

function empty() { return { name: '', client: '', status: '진행중' } }

export default function ProjectList({ projects, payments, subscriptions, onRefresh, loading }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const handleSort = (val) => {
    if (sortBy === val) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(val); setSortDir('desc') }
  }

  const openAdd = () => { setForm(empty()); setEditId(null); setShowAddForm(true) }
  const openEdit = (item) => {
    setShowAddForm(false)
    setForm({ ...item })
    setEditId(item.id)
  }
  const closeForm = () => { setShowAddForm(false); setEditId(null) }

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editId) {
        const original = projects.find(p => p.id === editId)
        await updateProject({ ...original, ...form })
      } else {
        await addProject(form)
      }
      closeForm(); onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.name}" 프로젝트를 삭제할까요?`)) return
    await deleteProject(item); onRefresh()
  }

  const getProjectStats = (projectId) => {
    const all = [
      ...payments.filter(p => p.project === projectId),
      ...subscriptions.filter(s => s.project === projectId)
    ]
    return {
      total: all.reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      unsettled: all.filter(r => r.settleStatus === '미청구').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      billed: all.filter(r => r.settleStatus === '청구완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      settled: all.filter(r => r.settleStatus === '정산완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      items: all,
    }
  }

  const [sortBy, setSortBy] = useState('latest')

  const STATUS_ORDER = { '미청구': 0, '청구완료': 1, '정산완료': 2 }

  const filteredProjects = projects
    .slice()
    .filter(p => {
      if (!search) return true
      return p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'latest') return dir * (projects.indexOf(a) - projects.indexOf(b))
      if (sortBy === 'name')   return dir * a.name.localeCompare(b.name, 'ko')
      if (sortBy === 'cost') {
        const aTotal = [...payments, ...subscriptions].filter(r => r.project === a.id).reduce((s, r) => s + toKRW(r.amount, r.currency), 0)
        const bTotal = [...payments, ...subscriptions].filter(r => r.project === b.id).reduce((s, r) => s + toKRW(r.amount, r.currency), 0)
        return dir * (aTotal - bTotal)
      }
      if (sortBy === 'status') return dir * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
      return 0
    })

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="프로젝트명, 광고주 검색..." />
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
      </div>

      <SortBar sortBy={sortBy} sortDir={sortDir} onSort={handleSort} options={[
        { value: 'latest', label: '최신순' },
        { value: 'name',   label: '이름순' },
        { value: 'cost',   label: '비용순' },
        { value: 'status', label: '정산상태순' },
      ]} />

      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
        {filteredProjects.length}개 프로젝트
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <ProjectForm form={form} setForm={setForm} onSave={save} onClose={closeForm} saving={saving} isEdit={false} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>불러오는 중...</div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>검색 결과가 없습니다</div>
      ) : filteredProjects.map(p => {
        const stats = getProjectStats(p.id)
        const sc = PROJECT_STATUS_COLORS[p.status] || PROJECT_STATUS_COLORS['진행중']
        const isOpen = selected === p.id
        const isEditing = editId === p.id

        // 인라인 수정 폼
        if (isEditing) {
          return (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <ProjectForm form={form} setForm={setForm} onSave={save} onClose={closeForm} saving={saving} isEdit={true} />
            </div>
          )
        }

        return (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', marginBottom: 10, overflow: 'hidden' }}>
            {/* 헤더 (클릭시 펼치기) */}
            <div onClick={() => setSelected(isOpen ? null : p.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: sc.bg, color: sc.text, borderRadius: 20, flexShrink: 0 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{p.client} · {stats.items.length}건</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(stats.total)}원</div>
                  <div style={{ fontSize: 10, color: '#E24B4A' }}>미청구 {fmt(stats.unsettled)}원</div>
                </div>
                <span style={{ fontSize: 14, color: COLORS.textSecondary, marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* 펼쳐진 상세 */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #f0f0f5', background: '#fafafa' }}>

                {/* 정산 요약 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 16px' }}>
                  {[
                    { label: '미청구', value: stats.unsettled, color: '#E65100' },
                    { label: '청구완료', value: stats.billed, color: '#0D47A1' },
                    { label: '정산완료', value: stats.settled, color: COLORS.success },
                  ].map(c => (
                    <div key={c.label} style={{ background: '#fff', borderRadius: 10, padding: '10px', border: '1px solid #e5e5ea', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{fmt(c.value)}원</div>
                    </div>
                  ))}
                </div>

                {/* 결제 내역 리스트 */}
                {stats.items.length > 0 && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>결제 내역</div>
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e5ea', overflow: 'hidden' }}>
                      {stats.items.sort((a, b) => new Date(b.date || b.startDate) - new Date(a.date || a.startDate)).map((item, i) => {
                        const sc2 = SETTLE_COLORS[item.settleStatus] || SETTLE_COLORS['미청구']
                        const isLast = i === stats.items.length - 1
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: isLast ? 'none' : '1px solid #f5f5f7' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <ServiceIcon serviceName={item.service} size={14} style={{ fontSize: 12, fontWeight: 500 }} />
                              </div>
                              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>
                                {item.date || item.startDate} {item.cycle && `· ${item.cycle}`}
                              </div>
                            </div>
                            <span style={{ fontSize: 9, padding: '2px 6px', background: sc2.bg, color: sc2.text, borderRadius: 20, flexShrink: 0 }}>{item.settleStatus}</span>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>
                                {item.currency !== 'KRW' ? `${item.currency} ${item.amount.toLocaleString()}` : `${fmt(item.amount)}원`}
                              </div>
                              {item.currency !== 'KRW' && <div style={{ fontSize: 9, color: COLORS.textSecondary }}>≈{fmt(toKRW(item.amount, item.currency))}원</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 수정/삭제 버튼 */}
                <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px' }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(p) }} style={{ flex: 1, padding: '7px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer' }}>수정</button>
                  <button onClick={(e) => { e.stopPropagation(); remove(p) }} style={{ flex: 1, padding: '7px', background: '#FFF0F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>삭제</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProjectForm({ form, setForm, onSave, onClose, saving, isEdit }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{isEdit ? '프로젝트 수정' : '프로젝트 추가'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="프로젝트명" style={{ gridColumn: '1/-1' }}>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="프로젝트명" style={inputStyle} />
        </Field>
        <Field label="광고주">
          <input value={form.client} onChange={e => setForm(f => ({...f, client: e.target.value}))} placeholder="광고주명" style={inputStyle} />
        </Field>
        <Field label="상태">
          <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={inputStyle}>
            {['진행중', '완료', '정산완료'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '저장 중...' : (isEdit ? '수정 완료' : '저장')}
        </button>
        <button onClick={onClose} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

function SortBar({ sortBy, sortDir, onSort, options }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      {options.map(s => {
        const active = sortBy === s.value
        return (
          <button key={s.value} onClick={() => onSort(s.value)}
            style={{ display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11, padding: '5px 10px', borderRadius: 20,
              border: '1px solid ' + (active ? COLORS.primary : '#d2d2d7'),
              background: active ? COLORS.primaryLight : '#fff',
              color: active ? COLORS.primary : COLORS.textSecondary,
              cursor: 'pointer', fontWeight: active ? 600 : 400 }}>
            {s.label}
            {active && (
              <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
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

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff' }
