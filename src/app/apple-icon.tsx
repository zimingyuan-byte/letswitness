import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#18181b',
          borderRadius: 36,
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}>
        <div
          style={{
            color: 'white',
            display: 'flex',
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: '-0.08em',
          }}>
          LW
        </div>
      </div>
    ),
    size
  )
}
