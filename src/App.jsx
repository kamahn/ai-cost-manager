import { useState, useEffect, useCallback } from 'react'
import { loadGoogleAPI, initTokenClient, requestLogin, restoreToken, getAccessToken, logout, fetchUserInfo } from './auth.js'
import { getPayments, getSubscriptions, getProjects, getServices } from './sheets.js'
import { checkAndSendRenewalAlerts } from './gmail.js'
import Dashboard from './components/Dashboard.jsx'
import PaymentList from './components/PaymentList.jsx'
import SubscriptionList from './components/SubscriptionList.jsx'
import ProjectList from './components/ProjectList.jsx'
import { COLORS } from './styles.js'

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: '📊' },
  { id: 'payments',  label: '결제내역', icon: '💳' },
  { id: 'subs',      label: '구독',     icon: '🔄' },
  { id: 'projects',  label: '프로젝트', icon: '📁' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [projects, setProjects] = useState([])
  const [services, setServices] = useState([])

  // 구글 API 초기화
  useEffect(() => {
    loadGoogleAPI().then(() => {
      initTokenClient(async (response) => {
        if (response.access_token) {
          const info = await fetchUserInfo(response.access_token)
          setUser(info)
          localStorage.setItem('user_info', JSON.stringify(info))
          setLoggedIn(true)
        }
      })
      // 저장된 토큰 복원
      if (restoreToken()) {
        const savedUser = localStorage.getItem('user_info')
        if (savedUser) setUser(JSON.parse(savedUser))
        setLoggedIn(true)
      }
      setReady(true)
    })
  }, [])

  // 데이터 로드
  const loadAll = useCallback(async () => {
    if (!getAccessToken()) return
    setLoading(true)
    try {
      const [p, s, pr, sv] = await Promise.all([getPayments(), getSubscriptions(), getProjects(), getServices()])
      setPayments(p)
      setSubscriptions(s)
      setProjects(pr)
      setServices(sv)
    } catch (e) {
      console.error('데이터 로드 실패:', e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (loggedIn) loadAll()
  }, [loggedIn, loadAll])

  const handleLogin = () => requestLogin()
  const handleLogout = () => { logout(); setLoggedIn(false); setUser(null) }

  const handleCheckAlerts = async () => {
    if (!user?.email) return
    setAlertLoading(true)
    setAlertMsg('')
    try {
      const result = await checkAndSendRenewalAlerts(subscriptions, user.email)
      setAlertMsg(result.sent ? `✅ ${result.count}건 알림 메일을 발송했습니다.` : '알림 대상이 없습니다.')
      setTimeout(() => setAlertMsg(''), 4000)
    } catch(e) {
      setAlertMsg('❌ 메일 발송 실패: ' + e.message)
    } finally { setAlertLoading(false) }
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 32 }}>🤖</div>
        <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>로딩 중...</div>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 24, padding: 32 }}>
        <div style={{ fontSize: 48 }}>🤖</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>AI 비용 관리</div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
            AI 툴 구독 및 크레딧 결제 내역을<br />구글 시트와 연동해서 관리합니다.
          </div>
        </div>
        <button onClick={handleLogin}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: '#fff', border: '1px solid #d2d2d7', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} height={20} alt="Google" />
          Google 계정으로 로그인
        </button>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
          로그인 시 구글 시트와 Gmail 접근 권한을 요청합니다.
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5ea', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>AI 비용 관리</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.picture && <img src={user.picture} width={28} height={28} style={{ borderRadius: '50%' }} alt="profile" />}
          <button onClick={handleLogout} style={{ fontSize: 11, padding: '4px 10px', background: '#f5f5f7', border: 'none', borderRadius: 8, color: COLORS.textSecondary, cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {alertMsg && (
        <div style={{ background: '#E8F5E9', border: '1px solid #81C784', padding: '10px 16px', fontSize: 13, color: '#1B5E20', textAlign: 'center' }}>
          {alertMsg}
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
        {tab === 'dashboard' && <Dashboard payments={payments} subscriptions={subscriptions} projects={projects} onCheckAlerts={handleCheckAlerts} alertLoading={alertLoading} />}
        {tab === 'payments'  && <PaymentList payments={payments} projects={projects} services={services} onRefresh={loadAll} loading={loading} />}
        {tab === 'subs'      && <SubscriptionList subscriptions={subscriptions} projects={projects} services={services} onRefresh={loadAll} loading={loading} />}
        {tab === 'projects'  && <ProjectList projects={projects} payments={payments} subscriptions={subscriptions} onRefresh={loadAll} loading={loading} />}
      </div>

      {/* 하단 탭바 */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e5ea', display: 'flex', position: 'sticky', bottom: 0, zIndex: 100 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 4px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? COLORS.primary : COLORS.textSecondary, borderTop: `2px solid ${tab === t.id ? COLORS.primary : 'transparent'}` }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
