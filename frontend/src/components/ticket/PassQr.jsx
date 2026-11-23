import { QRCodeSVG } from 'qrcode.react'
import { cn } from '../../lib/cn'

/**
 * PassQr — the scan target on the participant pass (§7.4 QR rules):
 * error-correction level H, a 4-module quiet zone, no logo overlay, white
 * background with 8px padding. `value` is the signed token exactly as
 * issued — the QR never encodes anything else.
 */
export function PassQr({ value, size = 158, className }) {
  if (!value) return null
  return (
    <div
      data-testid="pass-qr"
      className={cn(
        'flex h-[174px] w-[174px] items-center justify-center rounded-[10px] bg-white p-2',
        'shadow-[0_0_0_1px_rgba(247,243,234,0.14)]',
        className
      )}
    >
      <QRCodeSVG value={value} size={size} level="H" marginSize={4} />
    </div>
  )
}

export default PassQr
