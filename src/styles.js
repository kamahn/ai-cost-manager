export const COLORS = {
  primary: '#7F77DD',
  primaryLight: '#EEEDFE',
  primaryDark: '#3C3489',
  success: '#1D9E75',
  successLight: '#E1F5EE',
  warning: '#BA7517',
  warningLight: '#FAEEDA',
  danger: '#E24B4A',
  dangerLight: '#FCEBEB',
  gray: '#888780',
  grayLight: '#F1EFE8',
  text: '#1d1d1f',
  textSecondary: '#6e6e73',
  border: '#d2d2d7',
  bg: '#f5f5f7',
  white: '#ffffff',
}

export const SETTLE_COLORS = {
  '미청구':   { bg: '#FFF3E0', text: '#E65100', border: '#FFB74D' },
  '청구완료': { bg: '#E3F2FD', text: '#0D47A1', border: '#64B5F6' },
  '정산완료': { bg: '#E8F5E9', text: '#1B5E20', border: '#81C784' },
}

export const PROJECT_STATUS_COLORS = {
  '진행중':   { bg: '#E3F2FD', text: '#0D47A1' },
  '완료':     { bg: '#E8F5E9', text: '#1B5E20' },
  '정산완료': { bg: '#F3E5F5', text: '#4A148C' },
}

export const card = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e5e5ea',
  padding: '16px 20px',
  marginBottom: 12,
}

export const fmt = (n) => Math.round(n).toLocaleString('ko-KR')
