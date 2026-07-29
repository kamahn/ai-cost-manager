import { useMemo } from 'react'
import { COLORS, SETTLE_COLORS, fmt } from '../styles.js'
import { toKRW } from '../sheets.js'
import ServiceIcon from './ServiceIcon.jsx'
import { getDisplayName } from '../serviceIcons.js'

const CHART_COLORS = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#D4537E','#639922','#BA7517','#E24B4A','#0F6E56','#888780']

export default function Dashboard({ payments, subscriptions, projects, onCheckAlerts, alertLoading }) {
  const allItems = useMemo(() => [
    ...payments.map(p => ({ ...p, _type: '크레딧' })),
    ...subscriptions.map(s => ({ ...s, _type: '구독' }))
  ], [payments, subscriptions])

  const totalKRW = allItems.reduce((s, r) => s + toKRW(r.amount, r.currency), 0)
  const unSettled = allItems.filter(r => r.settleStatus === '미청구').reduce((s, r) => s + toKRW(r.amount, r.currency), 0)
  const billed = allItems.filter(r => r.settleStatus === '청구완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0)
  const settled = allItems.filter(r => r.settleStatus === '정산완료').reduce((s, r) => s + toKRW(r.amount, r.currency), 0)

  // 서비스별 집계
  const byService = {}
  allItems.forEach(r => {
    const key = getDisplayName(r.service) || '기타'
    byService[key] = (byService[key] || 0) + toKRW(r.amount, r.currency)
  })
  const serviceEntries = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const serviceMax = Math.max(...serviceEntries.map(e => e[1]), 1)

  // 갱신 임박 구독 (7일 이내)
  const today = new Date(); today.setHours(0,0,0,0)
  const upcoming = subscriptions.filter(s => {
    if (!s.renewDate) return false
    const d = new Date(s.renewDate)
    const diff = Math.ceil((d - today) / 86400000)
    return diff >= 0 && diff <= 7
  }).map(s => ({ ...s, daysLeft: Math.ceil((new Date(s.renewDate) - today) / 86400000) }))

  // 프로젝트별 미정산 금액
  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p.name })
  const byProject = {}
  allItems.filter(r => r.settleStatus !== '정산완료').forEach(r => {
    const pName = projectMap[r.project] || r.project || '미지정'
    byProject[pName] = (byProject[pName] || 0) + toKRW(r.amount, r.currency)
  })
  const projectEntries = Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const projectMax = Math.max(...projectEntries.map(e => e[1]), 1)

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* 갱신 알림 배너 */}
      {upcoming.length > 0 && (
        <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E65100' }}>구독 갱신 임박 {upcoming.length}건</div>
              <div style={{ fontSize: 11, color: '#BF360C', marginTop: 2 }}>
                {upcoming.slice(0, 2).map(s => `${getDisplayName(s.service)} (${s.daysLeft}일 후)`).join(', ')}
                {upcoming.length > 2 && ` 외 ${upcoming.length - 2}건`}
              </div>
            </div>
          </div>
          <button onClick={onCheckAlerts} disabled={alertLoading}
            style={{ fontSize: 12, padding: '6px 12px', background: '#E65100', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', opacity: alertLoading ? 0.6 : 1 }}>
            {alertLoading ? '발송 중...' : '메일 알림 발송'}
          </button>
        </div>
      )}

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: '전체 지출', value: fmt(totalKRW) + '원', icon: '💰', color: COLORS.primary },
          { label: '미청구', value: fmt(unSettled) + '원', icon: '⏳', color: '#E65100', sub: '아직 청구 못 한 금액' },
          { label: '청구완료', value: fmt(billed) + '원', icon: '📤', color: '#0D47A1', sub: '입금 대기 중' },
          { label: '정산완료', value: fmt(settled) + '원', icon: '✅', color: COLORS.success, sub: '실제 돌려받은 금액' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{c.icon}</span> {c.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* 서비스별 지출 차트 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>서비스별 지출</div>
        {serviceEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: 13, padding: '20px 0' }}>데이터 없음</div>
        ) : serviceEntries.map(([key, val], i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 80, fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</div>
            <div style={{ flex: 1, background: '#f5f5f7', borderRadius: 4, height: 18, overflow: 'hidden' }}>
              <div style={{ width: Math.max((val / serviceMax) * 100, 2) + '%', height: '100%', background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
            </div>
            <div style={{ width: 65, fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', flexShrink: 0 }}>{fmt(val)}원</div>
          </div>
        ))}
      </div>

      {/* 프로젝트별 미정산 */}
      {projectEntries.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>프로젝트별 미정산 금액</div>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 }}>정산완료 제외</div>
          {projectEntries.map(([key, val], i) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 80, fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</div>
              <div style={{ flex: 1, background: '#f5f5f7', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                <div style={{ width: Math.max((val / projectMax) * 100, 2) + '%', height: '100%', background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
              </div>
              <div style={{ width: 65, fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', flexShrink: 0 }}>{fmt(val)}원</div>
            </div>
          ))}
        </div>
      )}

      {/* 최근 결제 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>최근 결제</div>
        {payments.slice(0, 5).map(p => {
          const sc = SETTLE_COLORS[p.settleStatus] || SETTLE_COLORS['미청구']
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f5f5f7' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <ServiceIcon serviceName={p.service} size={15} style={{ fontSize: 13, fontWeight: 500 }} />
                </div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{p.date}</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 8px', background: sc.bg, color: sc.text, borderRadius: 20, flexShrink: 0 }}>{p.settleStatus}</span>
              <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {p.currency !== 'KRW' ? `$${p.amount}` : `${fmt(p.amount)}원`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
