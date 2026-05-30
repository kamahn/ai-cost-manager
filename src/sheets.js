import { getAccessToken } from './auth.js'

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

function headers() {
  return { Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' }
}

// 시트 데이터 읽기
async function readSheet(range) {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`, { headers: headers() })
  const data = await res.json()
  return data.values || []
}

// 시트에 행 추가
async function appendRow(range, values) {
  const res = await fetch(
    `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: headers(), body: JSON.stringify({ values: [values] }) }
  )
  return res.json()
}

// 특정 셀 범위 업데이트
async function updateRange(range, values) {
  const res = await fetch(
    `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers: headers(), body: JSON.stringify({ values }) }
  )
  return res.json()
}

// 행 삭제
async function deleteRow(sheetId, rowIndex) {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
        }
      }]
    })
  })
  return res.json()
}

// 시트 ID 가져오기
async function getSheetIds() {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}?fields=sheets.properties`, { headers: headers() })
  const data = await res.json()
  const map = {}
  data.sheets?.forEach(s => { map[s.properties.title] = s.properties.sheetId })
  return map
}

// 쉼표 포함 금액 문자열 파싱
function parseAmount(val) {
  if (!val) return 0
  const cleaned = String(val).replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

// ID로 실제 행 번호 찾기 (정렬 후 _row 불일치 문제 해결)
async function findRowById(sheetName, id) {
  const rows = await readSheet(`${sheetName}!A:A`)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1  // 1-indexed
  }
  return null
}

// ── 결제내역 ──────────────────────────────────────────

export async function getPayments() {
  const rows = await readSheet('결제내역!A:J')
  if (rows.length < 2) return []
  const [, ...data] = rows
  return data
    .filter(r => r[0])
    .map((r, i) => ({
      _row: i + 2,  // 원본 시트 위치 (정렬 전)
      id: r[0] || '',
      date: r[1] || '',
      service: r[2] || '',
      project: r[3] || '',
      currency: r[4] || 'USD',
      amount: parseAmount(r[5]),
      memo: r[6] || '',
      settleStatus: r[7] || '미청구',
      billingDate: r[8] || '',
      settleDate: r[9] || '',
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export async function addPayment(p) {
  const id = crypto.randomUUID().slice(0, 8)
  await appendRow('결제내역!A:J', [id, p.date, p.service, p.project, p.currency, p.amount, p.memo, p.settleStatus || '미청구', p.billingDate || '', p.settleDate || ''])
  return id
}

export async function updatePayment(item) {
  // ID로 실제 행 번호를 다시 찾아서 업데이트 (정렬 후 _row 오차 방지)
  const rowNum = await findRowById('결제내역', item.id)
  if (!rowNum) throw new Error('행을 찾을 수 없습니다: ' + item.id)
  await updateRange(`결제내역!A${rowNum}:J${rowNum}`, [[
    item.id, item.date, item.service, item.project,
    item.currency, item.amount, item.memo,
    item.settleStatus, item.billingDate || '', item.settleDate || ''
  ]])
}

export async function deletePayment(item) {
  const rowNum = await findRowById('결제내역', item.id)
  if (!rowNum) return
  const ids = await getSheetIds()
  await deleteRow(ids['결제내역'], rowNum - 1)
}

// ── 구독목록 ──────────────────────────────────────────

export async function getSubscriptions() {
  const rows = await readSheet('구독목록!A:L')
  if (rows.length < 2) return []
  const [, ...data] = rows
  return data
    .filter(r => r[0])
    .map((r, i) => ({
      _row: i + 2,
      id: r[0] || '',
      service: r[1] || '',
      cycle: r[2] || '월간',
      currency: r[3] || 'KRW',
      amount: parseAmount(r[4]),
      startDate: r[5] || '',
      renewDate: r[6] || '',
      project: r[7] || '',
      memo: r[8] || '',
      settleStatus: r[9] || '미청구',
      billingDate: r[10] || '',
      settleDate: r[11] || '',
    }))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
}

export async function addSubscription(s) {
  const id = crypto.randomUUID().slice(0, 8)
  await appendRow('구독목록!A:L', [id, s.service, s.cycle, s.currency, s.amount, s.startDate, s.renewDate, s.project, s.memo || '', s.settleStatus || '미청구', s.billingDate || '', s.settleDate || ''])
  return id
}

export async function updateSubscription(item) {
  const rowNum = await findRowById('구독목록', item.id)
  if (!rowNum) throw new Error('행을 찾을 수 없습니다: ' + item.id)
  await updateRange(`구독목록!A${rowNum}:L${rowNum}`, [[
    item.id, item.service, item.cycle, item.currency,
    item.amount, item.startDate, item.renewDate, item.project,
    item.memo || '', item.settleStatus, item.billingDate || '', item.settleDate || ''
  ]])
}

export async function deleteSubscription(item) {
  const rowNum = await findRowById('구독목록', item.id)
  if (!rowNum) return
  const ids = await getSheetIds()
  await deleteRow(ids['구독목록'], rowNum - 1)
}

// ── 프로젝트 ──────────────────────────────────────────

export async function getProjects() {
  const rows = await readSheet('프로젝트!A:D')
  if (rows.length < 2) return []
  const [, ...data] = rows
  return data.filter(r => r[0]).map((r, i) => ({
    _row: i + 2,
    id: r[0] || '',
    name: r[1] || '',
    client: r[2] || '',
    status: r[3] || '진행중',
  }))
}

export async function addProject(p) {
  const id = crypto.randomUUID().slice(0, 8)
  await appendRow('프로젝트!A:D', [id, p.name, p.client, p.status || '진행중'])
  return id
}

export async function updateProject(item) {
  const rowNum = await findRowById('프로젝트', item.id)
  if (!rowNum) throw new Error('행을 찾을 수 없습니다: ' + item.id)
  await updateRange(`프로젝트!A${rowNum}:D${rowNum}`, [[item.id, item.name, item.client, item.status]])
}

export async function deleteProject(item) {
  const rowNum = await findRowById('프로젝트', item.id)
  if (!rowNum) return
  const ids = await getSheetIds()
  await deleteRow(ids['프로젝트'], rowNum - 1)
}

// ── 서비스명 목록 ──────────────────────────────────────

export async function getServices() {
  const rows = await readSheet('서비스명!A:A')
  if (rows.length < 2) return []
  return rows.slice(1).map(r => r[0]).filter(Boolean)
}

// ── 유틸 ──────────────────────────────────────────────

export function toKRW(amount, currency) {
  if (currency === 'KRW') return amount
  if (currency === 'USD') return amount * 1380
  if (currency === 'EUR') return amount * 1490
  return amount
}
