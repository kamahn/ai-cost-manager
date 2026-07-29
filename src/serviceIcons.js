// 서비스명 → 도메인 매핑
const SERVICE_DOMAINS = {
  // 영상 생성
  'runway': 'runwayml.com',
  'kling': 'klingai.com',
  'higgsfield': 'higgsfield.ai',
  'pika': 'pika.art',
  'sora': 'openai.com',
  'luma': 'lumalabs.ai',
  'hailuo': 'hailuoai.com',
  'vidu': 'vidu.studio',
  'seedance': 'bytedance.com',

  // 이미지 생성
  'midjourney': 'midjourney.com',
  'stable diffusion': 'stability.ai',
  'firefly': 'adobe.com',
  'ideogram': 'ideogram.ai',
  'leonardo': 'leonardo.ai',
  'dall-e': 'openai.com',
  'gpt image': 'openai.com',
  'flux': 'blackforestlabs.ai',

  // AI 어시스턴트
  'chatgpt': 'openai.com',
  'openai': 'openai.com',
  'claude': 'claude.ai',
  'gemini': 'gemini.google.com',
  'perplexity': 'perplexity.ai',
  'copilot': 'microsoft.com',

  // 오디오/음악
  'suno': 'suno.ai',
  'udio': 'udio.com',
  'elevenlabs': 'elevenlabs.io',
  'mubert': 'mubert.com',

  // 코딩/개발
  'comfyui': 'comfy.org',
  'cursor': 'cursor.sh',
  'github copilot': 'github.com',
  'fal.ai': 'fal.ai',
  'replicate': 'replicate.com',

  // 기타
  'artlist': 'artlist.io',
  'freepik': 'freepik.com',
  'lalals': 'lalals.com',
  'topaz': 'topazlabs.com',
  'adobe': 'adobe.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
}

// 서비스명에서 도메인 찾기
function findDomain(serviceName) {
  if (!serviceName) return null
  const lower = serviceName.toLowerCase()
    .replace(/^[^\s]+\s/, '')  // 이모지+공백 제거
    .trim()

  // 정확히 일치
  if (SERVICE_DOMAINS[lower]) return SERVICE_DOMAINS[lower]

  // 부분 일치
  for (const [key, domain] of Object.entries(SERVICE_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) return domain
  }
  return null
}

// 파비콘 URL 반환
export function getFaviconUrl(serviceName) {
  const domain = findDomain(serviceName)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

// 표시명 치환 (실제 데이터의 이름을 그대로 두고 화면에만 다르게 표시)
const DISPLAY_NAME_OVERRIDES = {
  'openai': 'ChatGPT',
}

// 서비스 표시명 (이모지 제거)
export function getDisplayName(serviceName) {
  if (!serviceName) return ''
  const cleaned = serviceName.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '').trim()
  const override = DISPLAY_NAME_OVERRIDES[cleaned.toLowerCase()]
  return override || cleaned
}
