import { getAccessToken } from './auth.js'

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

function headers() {
  return { Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' }
}

async function readSheet(range) {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`, { headers: headers() })
  const data = await res.json()
  return data.values || []
}

async function appendRow(range, values) {
  const res = await fetch(
    `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: headers(), body: JSON.stringify({ values: [values] }) }
  )
  return res.json()
}

async function updateRange(range, values) {
  const res = await fetch(
    `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers: headers(), body: JSON.stringify({ values }) }
  )
  return res.json()
}

async function deleteRow(sheetId, rowIndex) {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }]
    })
  })
  return res.json()
}

async function getSheetIds() {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}?fields=sheets.properties`, { headers: headers() })
  const data = await res.json()
  const map = {}
  data.sheets?.forEach(s => { map[s.properties.title] = s.properties.sheetId })
  return map
}

function parseAmount(val) {
  if (!val) return 0
  return parseFloat(String(val).replace(/,/g, '')) || 0
}

async function findRowById(sheetName, id) {
  const rows = await readSheet(`${sheetName}!A:A`)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1
  }
  return null
}

// ── 결제내역 (K열: 인보이스URL 추가) ──────────────────────────────

export async function getPayments() {
  const rows = await readSheet('결제내역!A:K')
  if (rows.length < 2) return []
  const [, ...data] = rows
  return data
    .filter(r => r[0])
    .map((r, i) => ({
      _row: i + 2,
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
      invoiceUrl: r[10] || '',
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export async function addPayment(p) {
  const id = crypto.randomUUID().slice(0, 8)
  await appendRow('결제내역!A:K', [
    id, p.date, p.service, p.project, p.currency, p.amount,
    p.memo || '', p.settleStatus || '미청구', p.billingDate || '',
    p.settleDate || '', p.invoiceUrl || ''
  ])
  return id
}

export async function updatePayment(item) {
  const rowNum = await findRowById('결제내역', item.id)
  if (!rowNum) throw new Error('행을 찾을 수 없습니다: ' + item.id)
  await updateRange(`결제내역!A${rowNum}:K${rowNum}`, [[
    item.id, item.date, item.service, item.project,
    item.currency, item.amount, item.memo || '',
    item.settleStatus, item.billingDate || '', item.settleDate || '',
    item.invoiceUrl || ''
  ]])
}

export async function deletePayment(item) {
  const rowNum = await findRowById('결제내역', item.id)
  if (!rowNum) return
  const ids = await getSheetIds()
  await deleteRow(ids['결제내역'], rowNum - 1)
}

// ── 구독목록 (M열: 인보이스URL 추가) ──────────────────────────────

export async function getSubscriptions() {
  const rows = await readSheet('구독목록!A:M')
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
      invoiceUrl: r[12] || '',
    }))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
}

export async function addSubscription(s) {
  const id = crypto.randomUUID().slice(0, 8)
  await appendRow('구독목록!A:M', [
    id, s.service, s.cycle, s.currency, s.amount,
    s.startDate || '', s.renewDate || '', s.project || '',
    s.memo || '', s.settleStatus || '미청구', s.billingDate || '',
    s.settleDate || '', s.invoiceUrl || ''
  ])
  return id
}

export async function updateSubscription(item) {
  const rowNum = await findRowById('구독목록', item.id)
  if (!rowNum) throw new Error('행을 찾을 수 없습니다: ' + item.id)
  await updateRange(`구독목록!A${rowNum}:M${rowNum}`, [[
    item.id, item.service, item.cycle, item.currency,
    item.amount, item.startDate || '', item.renewDate || '', item.project || '',
    item.memo || '', item.settleStatus, item.billingDate || '',
    item.settleDate || '', item.invoiceUrl || ''
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
