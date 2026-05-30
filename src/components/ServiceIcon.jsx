import { useState } from 'react'
import { getFaviconUrl, getDisplayName } from '../serviceIcons.js'

export default function ServiceIcon({ serviceName, size = 18, showName = true, style = {} }) {
  const [imgError, setImgError] = useState(false)
  const faviconUrl = getFaviconUrl(serviceName)
  const displayName = getDisplayName(serviceName)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      {faviconUrl && !imgError ? (
        <img
          src={faviconUrl}
          alt={displayName}
          width={size}
          height={size}
          onError={() => setImgError(true)}
          style={{ borderRadius: 4, flexShrink: 0, objectFit: 'contain' }}
        />
      ) : (
        // 폴백: 서비스명 첫 글자로 아이콘 대체
        <span style={{
          width: size, height: size, borderRadius: 4, background: '#EEEDFE',
          color: '#7F77DD', fontSize: size * 0.6, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      {showName && <span>{displayName}</span>}
    </span>
  )
}
