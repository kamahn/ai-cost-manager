import { useState } from 'react'
import { COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW, addPayment, updatePayment, deletePayment } from '../sheets.js'
import ServiceIcon from './ServiceIcon.jsx'
import ServiceSelect from './ServiceSelect.jsx'
import DateInput from './DateInput.jsx'

const SETTLE_LIST = ['미청구', '청구완료', '정산완료']

function empty() {
  return { date: new Date().toISOString().slice(0,10), service: '', project: '', currency: 'USD', amount: '', memo: '', settleStatus: '미청구', billingDate: '', settleDate: '' }
}

export default function PaymentList({ payments, projects, services, onRefresh, loading }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('전체')
  const [filterProject, setFilterProject] = useState('전체')
  const [search, setSearch] = useState('')

  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const SETTLE_ORDER = { '미청구': 0, '청구완료': 1, '정산완료': 2 }

  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p.name })

  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const filtered = payments
    .filter(p => {
      const statusOk = filterStatus === '전체' || p.settleStatus === filterStatus
      const projectOk = filterProject === '전체' || p.project === filterProject
      const pName = projectMap[p.project] || p.project || ''
      const searchOk = !search ||
        p.service?.toLowerCase().includes(search.toLowerCase()) ||
        p.memo?.toLowerCase().includes(search.toLowerCase()) ||
        pName.toLowerCase().includes(search.toLowerCase())
      return statusOk && projectOk && searchOk
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'date')    return dir * (new Date(a.date) - new Date(b.date))
      if (sortBy === 'amount')  return dir * (toKRW(a.amount, a.currency) - toKRW(b.amount, b.currency))
      if (sortBy === 'service') return dir * (a.service || '').localeCompare(b.service || '', 'ko')
      if (sortBy === 'status')  return dir * ((SETTLE_ORDER[a.settleStatus] ?? 9) - (SETTLE_ORDER[b.settleStatus] ?? 9))
      return 0
    })

  const totalKRW = filtered.reduce((s, r) => s + toKRW(r.amount, r.currency), 0)

  const handleSort = (val) => {
    if (sortBy === val) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(val); setSortDir('desc') }
  }

  const openAdd = () => { setForm(empty()); setEditId(null); setShowAddForm(true) }
  const openEdit = (item) => { setShowAddForm(false); setForm({ ...item, amount: String(item.amount) }); setEditId(item.id) }
  const closeForm = () => { setShowAddForm(false); setEditId(null) }

  const save = async () => {
    if (!form.service || !form.amount) return
    setSaving(true)
    try {
      if (editId) {
        const original = payments.find(p => p.id === editId)
        await updatePayment({ ...original, ...form, amount: parseFloat(form.amount) })
      } else {
        await addPayment({ ...form, amount: parseFloat(form.amount) })
      }
      closeForm(); onRefresh()
    } finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.service}" 결제 내역을 삭제할까요?`)) return
    await deletePayment(item); onRefresh()
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* 검색 + 추가 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="서비스명, 프로젝트명, 메모 검색..." />
        <button onClick={openAdd} style={{ padding: '8px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 추가</button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {['전체', ...SETTLE_LIST].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid ' + (filterStatus === s ? COLORS.primary : '#d2d2d7'), background: filterStatus === s ? COLORS.primaryLight : '#fff', color: filterStatus === s ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontWeight: filterStatus === s ? 600 : 400 }}>
            {s}
          </button>
        ))}
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid #d2d2d7', background: '#fff', color: COLORS.textSecondary, cursor: 'pointer' }}>
          <option value="전체">전체 프로젝트</option>
          {sortedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <SortBar sortBy={sortBy} sortDir={sortDir} onSort={handleSort} options={[
        { value: 'date',    label: '날짜순' },
        { value: 'amount',  label: '금액순' },
        { value: 'service', label: '서비스순' },
        { value: 'status',  label: '정산상태순' },
      ]} />

      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
        {filtered.length}건 · 합계 <strong style={{ color: COLORS.text }}>{fmt(totalKRW)}원</strong>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <PaymentForm form={form} setForm={setForm} onSave={save} onClose={closeForm} saving={saving} isEdit={false} projects={sortedProjects} services={services} />
      )}

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: 13 }}>내역이 없습니다</div>
      ) : filtered.map(p => {
        const isEditing = editId === p.id
        const sc = SETTLE_COLORS[p.settleStatus] || SETTLE_COLORS['미청구']
        const pName = projectMap[p.project] || p.project || ''

        if (isEditing) {
          return (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <PaymentForm form={form} setForm={setForm} onSave={save} onClose={closeForm} saving={saving} isEdit={true} projects={sortedProjects} services={services} />
            </div>
          )
        }

        return (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ServiceIcon serviceName={p.service} size={16} style={{ fontSize: 14, fontWeight: 600 }} />
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

function PaymentForm({ form, setForm, onSave, onClose, saving, isEdit, projects, services }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${COLORS.primary}`, padding: '16px', marginBottom: 10, boxSizing: 'border-box', width: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{isEdit ? '결제 수정' : '결제 추가'}</div>

      {/* 날짜 - 전체 폭 */}
      <Field label="날짜" style={{ marginBottom: 10 }}>
        <DateInput value={form.date} onChange={v => setForm(f => ({...f, date: v}))} />
      </Field>

      {/* 서비스 - 전체 폭 */}
      <Field label="서비스" style={{ marginBottom: 10 }}>
        <ServiceSelect value={form.service} onChange={v => setForm(f => ({...f, service: v}))} services={services} />
      </Field>

      {/* 금액 - 전체 폭 */}
      <Field label="금액" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))} style={{ ...inputStyle, width: 80, flexShrink: 0 }}>
            {['USD','KRW','EUR'].map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
        </div>
      </Field>

      {/* 프로젝트 + 정산상태 나란히 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Field label="프로젝트">
          <select value={form.project} onChange={e => setForm(f => ({...f, project: e.target.value}))} style={inputStyle}>
            <option value="">미지정</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="정산 상태">
          <select value={form.settleStatus} onChange={e => setForm(f => ({...f, settleStatus: e.target.value}))} style={inputStyle}>
            {['미청구','청구완료','정산완료'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* 청구일 + 정산일 나란히 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Field label="청구일">
          <DateInput value={form.billingDate} onChange={v => setForm(f => ({...f, billingDate: v}))} />
        </Field>
        <Field label="정산일">
          <DateInput value={form.settleDate} onChange={v => setForm(f => ({...f, settleDate: v}))} />
        </Field>
      </div>

      {/* 메모 */}
      <Field label="메모" style={{ marginBottom: 14 }}>
        <input value={form.memo} onChange={e => setForm(f => ({...f, memo: e.target.value}))} placeholder="메모" style={inputStyle} />
      </Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '저장 중...' : (isEdit ? '수정 완료' : '저장')}
        </button>
        <button onClick={onClose} style={{ padding: '9px 16px', background: '#f5f5f7', color: COLORS.textSecondary, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>취소</button>
      </div>
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
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff', boxSizing: 'border-box' }} />
      {value && (
        <button onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#d2d2d7', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 10, color: '#fff', lineHeight: 1 }}>
          ✕
        </button>
      )}
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

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, background: '#fff', boxSizing: 'border-box' }
