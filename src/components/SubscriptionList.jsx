import { useState } from 'react'
import { COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW, addSubscription, updateSubscription, deleteSubscription } from '../sheets.js'

const SETTLE_LIST = ['미청구', '청구완료', '정산완료']
const CURRENCIES = ['KRW', 'USD', 'EUR']
const CYCLES = ['월간', '연간']

function empty() {
  return { service: '', cycle: '월간', currency: 'KRW', amount: '', startDate: '', renewDate: '', project: '', memo: '', settleStatus: '미청구', billingDate: '', settleDate: '' }
}

export default function SubscriptionList({ subscriptions, projects, services, onRefresh, loading }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('전체')

  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p.name })

  const today = new Date(); today.setHours(0,0,0,0)

  const filtered = subscriptions.filter(s => filterStatus === '전체' || s.settleStatus === filterStatus)

  const getDaysLeft = (renewDate) => {
    if (!renewDate) return null
    const d = new Date(renewDate)
    return Math.ceil((d - today) / 86400000)
  }

  const openAdd = () => { setForm(empty()); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({ ...item, amount: String(item.amount) }); setEditItem(item); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditItem(null) }

  const save = async () => {
    if (!form.service || !form.amount) return
    setSaving(true)
    try {
      if (editItem) {
        await updateSubscription({ ...editItem, ...form, amount: parseFloat(form.amount) })
      } else {
        await addSubscription({ ...form, amount: parseFloat(form.amount) })
      }
      closeForm()
      onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.service}" 구독을 삭제할까요?`)) return
    await deleteSubscription(item)
    onRefresh()
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, fontSize: 13, color: COLORS.textSecondary }}>{filtered.length}개 구독</div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['전체', ...SETTLE_LIST].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid ' + (filterStatus === s ? COLORS.primary : '#d2d2d7'), background: filterStatus === s ? COLORS.primaryLight : '#fff', color: filterStatus === s ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontWeight: filterStatus === s ? 600 : 400 }}>
            {s}
          </button>
        ))}
      </div>

      {/* 폼 */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{editItem ? '구독 수정' : '구독 추가'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="서비스">
              <select value={form.service} onChange={e => setForm(f => ({...f, service: e.target.value}))} style={inputStyle}>
                <option value="">선택</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="구독 주기">
              <select value={form.cycle} onChange={e => setForm(f => ({...f, cycle: e.target.value}))} style={inputStyle}>
                {CYCLES.map(c => <option key={c}>{c}</option>)}
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
            <Field label="구독 개시일">
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} style={inputStyle} />
            </Field>
            <Field label="갱신 예정일">
              <input type="date" value={form.renewDate} onChange={e => setForm(f => ({...f, renewDate: e.target.value}))} style={inputStyle} />
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
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>구독 내역이 없습니다</div>
      ) : filtered.map(s => {
        const sc = SETTLE_COLORS[s.settleStatus] || SETTLE_COLORS['미청구']
        const pName = projectMap[s.project] || s.project || ''
        const daysLeft = getDaysLeft(s.renewDate)
        const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
        return (
          <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isUrgent ? '#FFB74D' : '#e5e5ea'}`, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{s.service?.replace(/^[^\s]+\s/, '') || s.service}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: '#f5f5f7', color: COLORS.textSecondary, borderRadius: 20 }}>{s.cycle}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: sc.bg, color: sc.text, borderRadius: 20 }}>{s.settleStatus}</span>
                  {isUrgent && <span style={{ fontSize: 10, padding: '2px 8px', background: '#FFF3E0', color: '#E65100', borderRadius: 20, fontWeight: 600 }}>갱신 {daysLeft}일 후</span>}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary }}>
                  갱신일: {s.renewDate || '미설정'} {pName && `· ${pName}`}
                </div>
                {s.billingDate && <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>청구일: {s.billingDate}{s.settleDate && ` · 정산일: ${s.settleDate}`}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {s.currency !== 'KRW' ? `${s.currency} ${s.amount.toLocaleString()}` : `${fmt(s.amount)}원`}
                </div>
                {s.currency !== 'KRW' && <div style={{ fontSize: 10, color: COLORS.textSecondary }}>≈ {fmt(toKRW(s.amount, s.currency))}원</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => openEdit(s)} style={{ flex: 1, padding: '6px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer' }}>수정</button>
              <button onClick={() => remove(s)} style={{ flex: 1, padding: '6px', background: '#FFF0F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>삭제</button>
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
