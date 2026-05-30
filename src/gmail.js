import { getAccessToken } from './auth.js'

// Base64 URL 인코딩
function encodeEmail(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Gmail API로 메일 발송
export async function sendEmail(to, subject, body) {
  const email = `To: ${to}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body}`
  const encoded = encodeEmail(email)
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded })
  })
  return res.json()
}

// 갱신 알림 메일 내용 생성
function buildRenewalEmail(subs) {
  const rows = subs.map(s => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee">${s.service}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${s.renewDate}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${s.currency} ${s.amount.toLocaleString()}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${s.project}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;color:${s.daysLeft <= 3 ? '#E24B4A' : '#BA7517'};font-weight:bold">${s.daysLeft}일 후</td>
    </tr>
  `).join('')

  return `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#7F77DD;padding:20px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0">🔔 AI 툴 구독 갱신 알림</h2>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#444;margin-bottom:16px">아래 구독이 곧 갱신됩니다. 정산 처리를 확인해주세요.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f5f5f7">
              <th style="padding:10px;text-align:left">서비스</th>
              <th style="padding:10px;text-align:left">갱신일</th>
              <th style="padding:10px;text-align:left">금액</th>
              <th style="padding:10px;text-align:left">프로젝트</th>
              <th style="padding:10px;text-align:left">남은일</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:12px;color:#888">AI 비용 관리 앱에서 발송된 자동 알림입니다.</p>
      </div>
    </div>
  `
}

// 갱신 임박 구독 체크 및 알림 발송
export async function checkAndSendRenewalAlerts(subscriptions, userEmail) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = subscriptions.filter(s => {
    if (!s.renewDate) return false
    const renewDate = new Date(s.renewDate)
    const daysLeft = Math.ceil((renewDate - today) / (1000 * 60 * 60 * 24))
    s.daysLeft = daysLeft
    return daysLeft >= 0 && daysLeft <= 7
  })

  if (upcoming.length === 0) return { sent: false, count: 0 }

  const subject = `[AI 비용 관리] 구독 갱신 알림 — ${upcoming.length}건`
  const body = buildRenewalEmail(upcoming)
  await sendEmail(userEmail, subject, body)
  return { sent: true, count: upcoming.length }
}
