import { useState } from 'react'
import { COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW, addPayment, updatePayment, deletePayment } from '../sheets.js'

const SETTLE_LIST = ['미청구', '청구완료', '정산완료']
const CURRENCIES = ['USD', 'KRW', 'EUR']

function empty() {
  return { date: new Date().toISOString().slice(0,10), service: '', project: '', currency: 'USD', amount: '', memo: '', settleStatus: '미청구', billingDate: '', settleDate: '' }
}

export default function PaymentList({ payments, projects, services, onRefresh, loading }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('전체')
  const [filterProject, setFilterProject] = useState('전체')
  const [search, setSearch] = useState('')

  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p.name })

  const filtered = payments.filter(p => {
    const statusOk = filterStatus === '전체' || p.settleStatus === filterStatus
    const projectOk = filterProject === '전체' || p.project === filterProject
    const searchOk = !search || p.service?.toLowerCase().includes(search.toLowerCase()) || p.memo?.toLowerCase().includes(search.toLowerCase())
    return statusOk && projectOk && searchOk
  })

  const totalKRW = filtered.reduce((s, r) => s + toKRW(r.amount, r.currency), 0)

  const openAdd = () => { setForm(empty()); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({ ...item, amount: String(item.amount) }); setEditItem(item); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditItem(null) }

  const save = async () => {
    if (!form.service || !form.amount) return
    setSaving(true)
    try {
      if (editItem) {
        await updatePayment({ ...editItem, ...form, amount: parseFloat(form.amount) })
      } else {
        await addPayment({ ...form, amount: parseFloat(form.amount) })
      }
      closeForm()
      onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.service}" 결제 내역을 삭제할까요?`)) return
    await deletePayment(item)
    onRefresh()
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* 상단 필터 + 추가 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff' }} />
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 추가</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['전체', ...SETTLE_LIST].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid ' + (filterStatus === s ? COLORS.primary : '#d2d2d7'), background: filterStatus === s ? COLORS.primaryLight : '#fff', color: filterStatus === s ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontWeight: filterStatus === s ? 600 : 400 }}>
            {s}
          </button>
        ))}
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid #d2d2d7', background: '#fff', color: COLORS.textSecondary, cursor: 'pointer' }}>
          <option value="전체">전체 프로젝트</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
        {filtered.length}건 · 합계 <strong style={{ color: COLORS.text }}>{fmt(totalKRW)}원</strong>
      </div>

      {/* 폼 */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{editItem ? '결제 수정' : '결제 추가'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="날짜">
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inputStyle} />
            </Field>
            <Field label="서비스">
              <select value={form.service} onChange={e => setForm(f => ({...f, service: e.target.value}))} style={inputStyle}>
                <option value="">선택</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="금액">
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))} style={{ ...inputStyle, width: 70, flexShrink: 0 }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
            <Field label="프로젝트">
              <select value={form.project} onChange={e => setForm(f => ({...f, project: e.target.value}))} style={inputStyle}>
                <option value="">미지정</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="정산 상태">
              <select value={form.settleStatus} onChange={e => setForm(f => ({...f, settleStatus: e.target.value}))} style={inputStyle}>
                {SETTLE_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="청구일">
              <input type="date" value={form.billingDate} onChange={e => setForm(f => ({...f, billingDate: e.target.value}))} style={inputStyle} />
            </Field>
            <Field label="정산일">
              <input type="date" value={form.settleDate} onChange={e => setForm(f => ({...f, settleDate: e.target.value}))} style={inputStyle} />
            </Field>
          </div>
          <Field label="메모" style={{ marginTop: 10 }}>
            <input value={form.memo} onChange={e => setForm(f => ({...f, memo: e.target.value}))} placeholder="메모" style={inputStyle} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '저장 중...' : (editItem ? '수정 완료' : '저장')}
            </button>
            <button onClick={closeForm} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>내역이 없습니다</div>
      ) : filtered.map(p => {
        const sc = SETTLE_COLORS[p.settleStatus] || SETTLE_COLORS['미청구']
        const pName = projectMap[p.project] || p.project || ''
        return (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.service?.replace(/^[^\s]+\s/, '') || p.service}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: sc.bg, color: sc.text, borderRadius: 20, flexShrink: 0 }}>{p.settleStatus}</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary }}>
                  {p.date} {pName && `· ${pName}`} {p.memo && `· ${p.memo}`}
                </div>
                {p.billingDate && <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>청구일: {p.billingDate}{p.settleDate && ` · 정산일: ${p.settleDate}`}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {p.currency !== 'KRW' ? `${p.currency} ${p.amount.toLocaleString()}` : `${fmt(p.amount)}원`}
                </div>
                {p.currency !== 'KRW' && <div style={{ fontSize: 10, color: COLORS.textSecondary }}>≈ {fmt(toKRW(p.amount, p.currency))}원</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '6px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer' }}>수정</button>
              <button onClick={() => remove(p)} style={{ flex: 1, padding: '6px', background: '#FFF0F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>삭제</button>
            </div>
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
