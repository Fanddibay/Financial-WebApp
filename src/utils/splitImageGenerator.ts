import fanplannerLogoUrl from '@/assets/logo-picture-ava.png'
import type { Split } from '@/types/split'
import { formatIDR } from '@/utils/currency'

function getSplitAmounts(split: Split) {
  const subtotal = split.subtotal ?? split.total_bill
  const taxAmount = Math.round((subtotal * split.tax_percent) / 100)
  const serviceAmount = Math.round((subtotal * split.service_percent) / 100)
  const finalTotal = split.final_total ?? subtotal + taxAmount + serviceAmount
  return { subtotal, taxAmount, serviceAmount, finalTotal }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  leftText: string,
  rightText: string,
  xLeft: number,
  xRight: number,
  y: number,
  leftColor = '#64748b',
  rightColor = '#1e293b',
  leftBold = false,
  rightBold = false,
) {
  ctx.textAlign = 'left'
  ctx.fillStyle = leftColor
  ctx.font = `${leftBold ? 'bold ' : ''}13px system-ui, -apple-system, sans-serif`
  ctx.fillText(leftText, xLeft, y)

  ctx.textAlign = 'right'
  ctx.fillStyle = rightColor
  ctx.font = `${rightBold ? 'bold ' : ''}13px system-ui, -apple-system, sans-serif`
  ctx.fillText(rightText, xRight, y)

  ctx.textAlign = 'left'
}

/**
 * Generate a summary image from a Split for sharing.
 * Adds Fanplanner logo in footer branding.
 */
export async function generateSplitSummaryImage(split: Split): Promise<Blob> {
  const width = 400
  const padding = 24
  const lineHeight = 22
  const participantRows = split.participants.length

  // Dynamic height to avoid clipping when participants are many.
  const estimatedHeight = Math.max(520, 360 + participantRows * 28 + 90)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = estimatedHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  const bg = '#ffffff'
  const textDark = '#1e293b'
  const textMuted = '#64748b'
  const accent = '#42b883'
  const border = '#e2e8f0'

  let y = padding
  const { subtotal, taxAmount, serviceAmount, finalTotal } = getSplitAmounts(split)

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, canvas.height)

  // Header
  ctx.fillStyle = textDark
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
  const placeName = split.place_name || 'Patungan'
  ctx.fillText(placeName, padding, y)
  y += lineHeight + 4

  ctx.fillStyle = textMuted
  ctx.font = '13px system-ui, -apple-system, sans-serif'
  const dateStr = new Date(split.created_at).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  ctx.fillText(dateStr, padding, y)
  y += lineHeight + 16

  ctx.strokeStyle = border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  y += 20

  // Financial breakdown
  drawRow(ctx, 'Subtotal', formatIDR(subtotal), padding, width - padding, y)
  y += lineHeight
  drawRow(ctx, `PPN (${split.tax_percent}%)`, formatIDR(taxAmount), padding, width - padding, y)
  y += lineHeight
  drawRow(ctx, `Service (${split.service_percent}%)`, formatIDR(serviceAmount), padding, width - padding, y)
  y += lineHeight
  drawRow(ctx, 'Total', formatIDR(finalTotal), padding, width - padding, y, textDark, accent, true, true)
  y += lineHeight + 12

  ctx.strokeStyle = border
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  y += 20

  // Participant shares
  ctx.fillStyle = textDark
  ctx.font = '14px system-ui, -apple-system, sans-serif'
  for (const person of split.participants) {
    const label = person.isMe ? `${person.name} (Kamu)` : person.name
    drawRow(
      ctx,
      label,
      formatIDR(person.amount),
      padding,
      width - padding,
      y,
      textDark,
      person.isMe ? accent : textDark,
      false,
      true,
    )
    y += lineHeight + 4
  }

  y += 10
  ctx.strokeStyle = border
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  y += 20

  drawRow(
    ctx,
    'Kamu duluan ya 👀',
    formatIDR(split.my_portion),
    padding,
    width - padding,
    y,
    accent,
    accent,
    true,
    true,
  )

  // Footer brand block
  const footerY = canvas.height - padding - 24
  const logoSize = 16
  const gap = 6

  let logoLoaded = false
  try {
    const logo = await loadImage(fanplannerLogoUrl)
    const totalWidth = logoSize + gap + 112
    const startX = (width - totalWidth) / 2

    // Soft rounded square as logo holder.
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    const r = 4
    const boxX = startX
    const boxY = footerY - logoSize + 2
    const boxW = logoSize
    const boxH = logoSize
    ctx.moveTo(boxX + r, boxY)
    ctx.lineTo(boxX + boxW - r, boxY)
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r)
    ctx.lineTo(boxX + boxW, boxY + boxH - r)
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH)
    ctx.lineTo(boxX + r, boxY + boxH)
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r)
    ctx.lineTo(boxX, boxY + r)
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
    ctx.closePath()
    ctx.fill()

    ctx.drawImage(logo, startX, footerY - logoSize + 2, logoSize, logoSize)

    ctx.fillStyle = textMuted
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Generated by Fanplanner', startX + logoSize + gap, footerY + 2)
    logoLoaded = true
  } catch {
    // fallback below
  }

  if (!logoLoaded) {
    ctx.fillStyle = textMuted
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Generated by Fanplanner', width / 2, footerY + 2)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate image'))
      },
      'image/png',
      0.95,
    )
  })
}
