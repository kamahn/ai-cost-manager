import { getAccessToken } from './auth.js'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

// ── 서비스별 결제 메일 패턴 ──────────────────────────────────────

const SERVICE_PATTERNS = [
  // Higgsfield
  {
    service: '🎬 Higgsfield AI',
    senderDomains: ['higgsfield.ai'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge/i],
    type: 'payment',
  },
  // Runway
  {
    service: '🎬 Runway',
    senderDomains: ['runwayml.com', 'runway.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge/i],
    type: 'payment',
  },
  // Kling AI
  {
    service: '🎬 Kling AI',
    senderDomains: ['klingai.com', 'kuaishou.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge|order/i],
    type: 'payment',
  },
  // Midjourney
  {
    service: '🎨 Midjourney',
    senderDomains: ['midjourney.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // ComfyUI / ComfyOrg
  {
    service: '⚙️ ComfyUI',
    senderDomains: ['comfy.org', 'comfyui.com'],
    subjectPatterns: [/receipt|invoice|payment|credit|charge/i],
    type: 'payment',
  },
  // OpenAI (ChatGPT, DALL-E, Sora)
  {
    service: '🤖 ChatGPT',
    senderDomains: ['openai.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge/i],
    type: 'subscription',
    detectService: (subject, body) => {
      if (/sora/i.test(subject + body)) return '🎬 Sora'
      if (/dall-e|dalle/i.test(subject + body)) return '🎨 DALL-E'
      return '🤖 ChatGPT'
    }
  },
  // Anthropic (Claude)
  {
    service: '🤖 Claude',
    senderDomains: ['anthropic.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge/i],
    type: 'subscription',
  },
  // Google (Gemini)
  {
    service: '🤖 Gemini',
    senderDomains: ['google.com', 'payments.google.com'],
    subjectPatterns: [/gemini|google one|workspace/i],
    type: 'subscription',
  },
  // Suno
  {
    service: '🎵 Suno AI',
    senderDomains: ['suno.ai', 'suno.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // ElevenLabs
  {
    service: '🔊 ElevenLabs',
    senderDomains: ['elevenlabs.io'],
    subjectPatterns: [/receipt|invoice|payment|subscription|charge/i],
    type: 'subscription',
  },
  // Adobe (Firefly)
  {
    service: '🎨 Adobe Firefly',
    senderDomains: ['adobe.com', 'mail.adobe.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription|order/i],
    type: 'subscription',
  },
  // FAL.AI
  {
    service: '⚙️ FAL.AI',
    senderDomains: ['fal.ai'],
    subjectPatterns: [/receipt|invoice|payment|credit|charge/i],
    type: 'payment',
  },
  // Artlist
  {
    service: '🎵 Artlist',
    senderDomains: ['artlist.io'],
    subjectPatterns: [/receipt|invoice|payment|subscription|renewal/i],
    type: 'subscription',
  },
  // Freepik
  {
    service: '🎨 Freepik',
    senderDomains: ['freepik.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // Pika
  {
    service: '🎬 Pika',
    senderDomains: ['pika.art'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // Leonardo.AI
  {
    service: '🎨 Leonardo.AI',
    senderDomains: ['leonardo.ai'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // Perplexity
  {
    service: '🤖 Perplexity',
    senderDomains: ['perplexity.ai'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'subscription',
  },
  // Topaz
  {
    service: '🎨 Topaz',
    senderDomains: ['topazlabs.com'],
    subjectPatterns: [/receipt|invoice|payment|order/i],
    type: 'payment',
  },
  // Lalals
  {
    service: '🎵 Lalals',
    senderDomains: ['lalals.com'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'payment',
  },
  // Luma
  {
    service: '🎬 Luma AI',
    senderDomains: ['lumalabs.ai'],
    subjectPatterns: [/receipt|invoice|payment|subscription/i],
    type: 'payment',
  },
  // Stripe (범용 결제 대행)
  {
    service: null, // 서비스명은 본문에서 추출
    senderDomains: ['stripe.com'],
    subjectPatterns: [/receipt|invoice|payment/i],
    type: 'payment',
    isPaymentGateway: true,
  },
]

// ── 금액 추출 패턴 ──────────────────────────────────────

function extractAmount(text) {
  const patterns = [
    // USD: $12.34 / $1,234.00
    { regex: /\$\s?([\d,]+\.?\d*)/g, currency: 'USD' },
    // KRW: ₩12,345 / 12,345원 / 12,345 원
    { regex: /₩\s?([\d,]+)|(\d[\d,]+)\s?원/g, currency: 'KRW' },
    // EUR: €12.34
    { regex: /€\s?([\d,]+\.?\d*)/g, currency: 'EUR' },
    // Total: $12.34
    { regex: /(?:total|amount|charged|billed)[^\d$€₩]*[\$€₩]?\s?([\d,]+\.?\d*)/gi, currency: 'USD' },
  ]

  for (const { regex, currency } of patterns) {
    const matches = [...text.matchAll(regex)]
    if (matches.length > 0) {
      const amounts = matches
        .map(m => parseFloat((m[1] || m[2] || '0').replace(/,/g, '')))
        .filter(n => n > 0 && n < 100000)
      if (amounts.length > 0) {
        return { amount: Math.max(...amounts), currency }
      }
    }
  }
  return null
}

// ── 날짜 추출 ──────────────────────────────────────────

function extractDate(internalDate, dateHeader) {
  // 1순위: internalDate (Gmail이 보장하는 수신 타임스탬프, ms 단위)
  if (internalDate) {
    const d = new Date(parseInt(internalDate))
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }
  // 2순위: Date 헤더 파싱
  if (dateHeader) {
    const d = new Date(dateHeader)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

// ── Gmail API 헬퍼 ──────────────────────────────────────

async function gmailFetch(path) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` }
  })
  return res.json()
}

// Base64 URL 디코딩
function decodeBase64(str) {
  try {
    return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))))
  } catch {
    return ''
  }
}

// 메일 본문 추출
function extractBody(payload) {
  if (!payload) return ''

  // 단일 파트
  if (payload.body?.data) return decodeBase64(payload.body.data)

  // 멀티파트
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64(part.body.data)
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      }
      // 중첩 파트
      if (part.parts) {
        const nested = extractBody(part)
        if (nested) return nested
      }
    }
  }
  return ''
}

// PDF 첨부파일 찾기
function findPdfAttachment(payload) {
  if (!payload?.parts) return null
  for (const part of payload.parts) {
    if (part.mimeType === 'application/pdf' ||
        part.filename?.toLowerCase().endsWith('.pdf')) {
      return { attachmentId: part.body.attachmentId, filename: part.filename }
    }
    if (part.parts) {
      const nested = findPdfAttachment(part)
      if (nested) return nested
    }
  }
  return null
}

// PDF 또는 인보이스 링크 추출
function extractInvoiceUrl(body) {
  // PDF 직접 링크
  const pdfMatch = body.match(/https?:\/\/[^\s"'<>]+\.pdf[^\s"'<>]*/i)
  if (pdfMatch) return pdfMatch[0]
  // 인보이스/영수증 링크
  const invoiceMatch = body.match(/https?:\/\/[^\s"'<>]*(?:invoice|receipt|billing|payment)[^\s"'<>]*/i)
  if (invoiceMatch) return invoiceMatch[0]
  return null
}

// ── 메인 파싱 함수 ──────────────────────────────────────

function matchServicePattern(fromEmail, subject) {
  const fromLower = fromEmail.toLowerCase()
  for (const pattern of SERVICE_PATTERNS) {
    const domainMatch = pattern.senderDomains.some(d => fromLower.includes(d))
    if (!domainMatch) continue
    const subjectMatch = pattern.subjectPatterns.some(p => p.test(subject))
    if (!subjectMatch) continue
    return pattern
  }
  return null
}

export async function fetchPaymentEmails(sinceDate = '2024/10/01') {
  // Gmail 검색 쿼리
  const query = `after:${sinceDate.replace(/-/g, '/')} (subject:receipt OR subject:invoice OR subject:payment OR subject:subscription OR subject:"order confirmation" OR subject:charge OR subject:renewal)`

  const searchRes = await gmailFetch(
    `/messages?q=${encodeURIComponent(query)}&maxResults=100`
  )

  if (!searchRes.messages?.length) return []

  const results = []

  for (const msg of searchRes.messages) {
    try {
      const detail = await gmailFetch(`/messages/${msg.id}`)
      const headers = detail.payload?.headers || []

      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const date = headers.find(h => h.name === 'Date')?.value || ''
      const fromEmail = from.match(/<([^>]+)>/)?.[1] || from

      const pattern = matchServicePattern(fromEmail, subject)
      if (!pattern) continue

      const body = extractBody(detail.payload)
      const amountInfo = extractAmount(body + ' ' + subject)
      if (!amountInfo) continue

      // 서비스명 결정
      let serviceName = pattern.service
      if (pattern.detectService) {
        serviceName = pattern.detectService(subject, body)
      }
      if (pattern.isPaymentGateway) {
        // Stripe 등 결제 대행사: 본문에서 서비스명 추출 시도
        const serviceMatch = body.match(/(?:from|to|for)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+\$|\.)/i)
        serviceName = serviceMatch?.[1]?.trim() || '기타 결제'
      }

      // PDF 첨부파일 확인
      const pdfAttachment = findPdfAttachment(detail.payload)
      // 본문에서 인보이스 링크 추출 (첨부 없을 때)
      const invoiceUrl = pdfAttachment ? null : extractInvoiceUrl(body)

      console.log('[Gmail]', subject, '| hasPdf:', !!pdfAttachment, '| invoiceUrl:', invoiceUrl)

      results.push({
        messageId: msg.id,
        subject,
        from: fromEmail,
        date: extractDate(detail.internalDate, date),
        service: serviceName,
        amount: amountInfo.amount,
        currency: amountInfo.currency,
        type: pattern.type,
        hasPdf: !!pdfAttachment,
        pdfAttachmentId: pdfAttachment?.attachmentId || null,
        pdfFilename: pdfAttachment?.filename || null,
        invoiceUrl: invoiceUrl || '',
        snippet: detail.snippet || '',
      })
    } catch (e) {
      console.warn('메일 파싱 오류:', msg.id, e)
    }
  }

  // 날짜 최신순 정렬
  return results.sort((a, b) => new Date(b.date) - new Date(a.date))
}

// PDF 첨부파일 데이터 가져오기
export async function fetchPdfAttachment(messageId, attachmentId) {
  const res = await gmailFetch(`/messages/${messageId}/attachments/${attachmentId}`)
  return res.data // base64 encoded
}
