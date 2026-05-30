import { useState } from 'react'
import { COLORS, PROJECT_STATUS_COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW, addProject, updateProject, deleteProject } from '../sheets.js'

const STATUS_LIST = ['진행중', '완료', '정산완료']

function empty() { return { name: '', client: '', status: '진행중' } }

export default function ProjectList({ projects, payments, subscriptions, onRefresh, loading }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  const openAdd = () => { setForm(empty()); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({ ...item }); setEditItem(item); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditItem(null) }

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editItem) { await updateProject({ ...editItem, ...form }) }
      else { await addProject(form) }
      closeForm(); onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.name}" 프로젝트를 삭제할까요?`)) return
    await deleteProject(item); onRefresh()
  }

  // 프로젝트별 비용 집계
  const getProjectStats = (projectId) => {
    const pPayments = payments.filter(p => p.project === projectId)
    const pSubs = subscriptions.filter(s => s.project === projectId)
    const all = [...pPayments, ...pSubs]
    return {
      total: all.reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      unsettled: all.filter(r => r.settleStatus === '미청구').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      billed: all.filter(r => r.settleStatus === '청구완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      settled: all.filter(r => r.settleStatus === '정산완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0),
      count: all.length,
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, fontSize: 13, color: COLORS.textSecondary }}>{projects.length}개 프로젝트</div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{editItem ? '프로젝트 수정' : '프로젝트 추가'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="프로젝트명" style={{ gridColumn: '1/-1' }}>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="프로젝트명" style={inputStyle} />
            </Field>
            <Field label="광고주">
              <input value={form.client} onChange={e => setForm(f => ({...f, client: e.target.value}))} placeholder="광고주명" style={inputStyle} />
            </Field>
            <Field label="상태">
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={inputStyle}>
                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '저장 중...' : (editItem ? '수정 완료' : '저장')}
            </button>
            <button onClick={closeForm} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>불러오는 중...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>프로젝트가 없습니다</div>
      ) : projects.map(p => {
        const stats = getProjectStats(p.id)
        const sc = PROJECT_STATUS_COLORS[p.status] || PROJECT_STATUS_COLORS['진행중']
        const isOpen = selected === p.id
        return (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', marginBottom: 10, overflow: 'hidden' }}>
            <div onClick={() => setSelected(isOpen ? null : p.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: sc.bg, color: sc.text, borderRadius: 20, flexShrink: 0 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{p.client} · {stats.count}건</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(stats.total)}원</div>
                  <div style={{ fontSize: 10, color: '#E24B4A' }}>미청구 {fmt(stats.unsettled)}원</div>
                </div>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid #f5f5f7', padding: '12px 16px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(p) }} style={{ flex: 1, padding: '6px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer' }}>수정</button>
                  <button onClick={(e) => { e.stopPropagation(); remove(p) }} style={{ flex: 1, padding: '6px', background: '#FFF0F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>삭제</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
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

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff' }
