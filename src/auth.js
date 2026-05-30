const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

let tokenClient = null
let accessToken = null

// 구글 API 스크립트 로드
export function loadGoogleAPI() {
  return new Promise((resolve) => {
    if (window.google) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    document.head.appendChild(script)
  })
}

// 토큰 클라이언트 초기화
export function initTokenClient(callback) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token
        localStorage.setItem('gapi_token', response.access_token)
        localStorage.setItem('gapi_token_expiry', Date.now() + (response.expires_in * 1000))
      }
      callback(response)
    }
  })
}

// 로그인 요청
export function requestLogin() {
  if (!tokenClient) return
  tokenClient.requestAccessToken({ prompt: 'consent' })
}

// 저장된 토큰 복원
export function restoreToken() {
  const token = localStorage.getItem('gapi_token')
  const expiry = localStorage.getItem('gapi_token_expiry')
  if (token && expiry && Date.now() < Number(expiry)) {
    accessToken = token
    return true
  }
  return false
}

// 현재 토큰 반환
export function getAccessToken() {
  return accessToken
}

// 로그아웃
export function logout() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
  accessToken = null
  localStorage.removeItem('gapi_token')
  localStorage.removeItem('gapi_token_expiry')
  localStorage.removeItem('user_info')
}

// 유저 정보 가져오기
export async function fetchUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}
