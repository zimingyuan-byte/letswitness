import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}>
        <div
          style={{
            alignItems: 'center',
            border: '20px solid rgba(255,255,255,0.12)',
            borderRadius: '120px',
            color: 'white',
            display: 'flex',
            fontSize: 220,
            fontWeight: 800,
            height: 360,
            justifyContent: 'center',
            letterSpacing: '-0.08em',
            width: 360,
          }}>
          LW
        </div>
      </div>
    ),
    size
  )
}
