import { useState } from 'react'
import { COLORS, fmt } from '../styles.js'
import { fetchPaymentEmails, fetchPdfAttachment } from '../gmailParser.js'
import { addPayment, addSubscription } from '../sheets.js'
import ServiceIcon from './ServiceIcon.jsx'

export default function GmailSync({ projects, services, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [emails, setEmails] = useState([])
  const [selected, setSelected] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [error, setError] = useState('')
  const [sinceDate, setSinceDate] = useState('2024-10-01')
  const [pdfViewer, setPdfViewer] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(null)

  const fetchEmails = async () => {
    setLoading(true)
    setError('')
    setEmails([])
    setSelected({})
    setSavedIds(new Set())
    try {
      const results = await fetchPaymentEmails(sinceDate)
      setEmails(results)
      if (results.length === 0) setError('해당 기간에 결제 관련 메일을 찾지 못했습니다.')
    } catch (e) {
      setError('메일 불러오기 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(s => ({ ...s, [id]: !s[id] }))
  }

  const selectAll = () => {
    const unsaved = emails.filter(e => !savedIds.has(e.messageId))
    const allSelected = unsaved.every(e => selected[e.messageId])
    const next = {}
    unsaved.forEach(e => { next[e.messageId] = !allSelected })
    setSelected(next)
  }

  const saveSelected = async () => {
    const toSave = emails.filter(e => selected[e.messageId] && !savedIds.has(e.messageId))
    if (!toSave.length) return
    setSaving(true)
    const newSaved = new Set(savedIds)
    try {
      for (const email of toSave) {
        const base = {
          service: email.service,
          amount: email.amount,
          currency: email.currency,
          date: email.date,
          startDate: email.date,
          memo: email.subject.slice(0, 50),
          settleStatus: '미청구',
          project: '',
          invoiceUrl: '',
        }
        if (email.type === 'subscription') {
          await addSubscription({ ...base, cycle: '월간', renewDate: '' })
        } else {
          await addPayment(base)
        }
        newSaved.add(email.messageId)
      }
      setSavedIds(newSaved)
      setSelected({})
      onRefresh()
    } catch (e) {
      setError('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const viewPdf = async (email) => {
    if (!email.pdfAttachmentId) return
    setPdfLoading(email.messageId)
    try {
      const base64Data = await fetchPdfAttachment(email.messageId, email.pdfAttachmentId)
      const binary = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfViewer({ url, filename: email.pdfFilename || 'invoice.pdf' })
    } catch (e) {
      setError('PDF 로드 실패: ' + e.message)
    } finally {
      setPdfLoading(null)
    }
  }

  const closePdf = () => {
    if (pdfViewer?.url) URL.revokeObjectURL(pdfViewer.url)
    setPdfViewer(null)
  }

  const downloadPdf = () => {
    if (!pdfViewer) return
    const a = document.createElement('a')
    a.href = pdfViewer.url
    a.download = pdfViewer.filename
    a.click()
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* PDF 뷰어 모달 */}
      {pdfViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1a1a1a', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              📄 {pdfViewer.filename}
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <button onClick={downloadPdf}
                style={{ padding: '6px 14px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                다운로드
              </button>
              <button onClick={closePdf}
                style={{ padding: '6px 14px', background: '#555', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
          <iframe src={pdfViewer.url} style={{ flex: 1, border: 'none', background: '#fff' }} title="Invoice PDF" />
        </div>
      )}

      {/* 기간 설정 + 가져오기 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Gmail 결제 메일 가져오기</div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
          지정한 날짜 이후 결제 관련 메일을 자동으로 분석합니다.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>시작 날짜</label>
            <input type="date" value={sinceDate} onChange={e => setSinceDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <button onClick={fetchEmails} disabled={loading}
            style={{ padding: '9px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {loading ? '검색 중...' : '메일 가져오기'}
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #FFB3B3', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#C62828' }}>
          {error}
        </div>
      )}

      {/* 결과 목록 */}
      {emails.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
              {emails.length}건 발견 · {savedIds.size}건 저장됨
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll}
                style={{ fontSize: 11, padding: '5px 12px', background: '#f5f5f7', border: 'none', borderRadius: 8, cursor: 'pointer', color: COLORS.textSecondary }}>
                전체 선택
              </button>
              {selectedCount > 0 && (
                <button onClick={saveSelected} disabled={saving}
                  style={{ fontSize: 11, padding: '5px 12px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? '저장 중...' : `${selectedCount}건 저장`}
                </button>
              )}
            </div>
          </div>

          {emails.map(email => {
            const isSaved = savedIds.has(email.messageId)
            const isSelected = !!selected[email.messageId]
            const isPdfLoading = pdfLoading === email.messageId

            return (
              <div key={email.messageId} style={{
                background: isSaved ? '#F1FFF6' : isSelected ? COLORS.primaryLight : '#fff',
                borderRadius: 14,
                border: `1px solid ${isSaved ? '#81C784' : isSelected ? COLORS.primary : '#e5e5ea'}`,
                padding: '12px 14px',
                marginBottom: 8,
              }}>
                {/* 메인 행 - 클릭시 선택 */}
                <div
                  onClick={() => !isSaved && toggleSelect(email.messageId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isSaved ? 'default' : 'pointer' }}>
                  {/* 체크박스 */}
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    background: isSaved ? '#4CAF50' : isSelected ? COLORS.primary : '#fff',
                    border: `1.5px solid ${isSaved ? '#4CAF50' : isSelected ? COLORS.primary : '#d2d2d7'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(isSaved || isSelected) && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                      <ServiceIcon serviceName={email.service} size={14} style={{ fontSize: 13, fontWeight: 600 }} />
                      <span style={{ fontSize: 10, padding: '1px 6px', background: email.type === 'subscription' ? '#E3F2FD' : '#FFF3E0', color: email.type === 'subscription' ? '#0D47A1' : '#E65100', borderRadius: 20 }}>
                        {email.type === 'subscription' ? '구독' : '결제'}
                      </span>
                      {email.hasPdf && <span style={{ fontSize: 10, padding: '1px 6px', background: '#F3E5F5', color: '#6A1B9A', borderRadius: 20 }}>📄 PDF</span>}
                      {email.invoiceUrl && <span style={{ fontSize: 10, padding: '1px 6px', background: '#E8F5E9', color: '#1B5E20', borderRadius: 20 }}>🔗 링크</span>}
                      {isSaved && <span style={{ fontSize: 10, color: '#4CAF50', fontWeight: 600 }}>저장완료</span>}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.subject}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>{email.date}</div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {email.currency !== 'KRW' ? `${email.currency} ${email.amount}` : `${fmt(email.amount)}원`}
                    </div>
                  </div>
                </div>

                {/* PDF 첨부 버튼 */}
                {email.hasPdf && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f5' }}>
                    <button
                      onClick={() => viewPdf(email)}
                      disabled={isPdfLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#F3E5F5', color: '#6A1B9A', border: '1px solid #CE93D8', borderRadius: 8, fontSize: 12, cursor: isPdfLoading ? 'wait' : 'pointer', fontWeight: 500, opacity: isPdfLoading ? 0.7 : 1 }}>
                      {isPdfLoading ? '⏳ 로딩 중...' : '📄 인보이스 PDF 보기'}
                    </button>
                  </div>
                )}

                {/* 인보이스 링크 버튼 */}
                {!email.hasPdf && email.invoiceUrl && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f5' }}>
                    <a
                      href={email.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#E8F5E9', color: '#1B5E20', border: '1px solid #81C784', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                      🔗 인보이스 링크 열기
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
