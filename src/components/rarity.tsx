import type { CardRarity } from '@/lib/gacha'

/**
 * 稀有度的视觉呈现。
 *
 * 规则（PRD §14.4）：**颜色永远不能是唯一的区分手段** ——
 * 色盲用户分不出 SR 的紫和 SSR 的金。所以每一处着色都必须带文字标签，
 * 这个文件只提供颜色，标签由调用方负责。
 */

/** 档位色。neobrutalism 下用实色 + 黑边，不用渐变。 */
export const RARITY_COLOR: Record<CardRarity, string> = {
  N: 'bg-muted text-foreground',
  R: 'bg-sky-400 text-black',
  SR: 'bg-violet-500 text-white',
  SSR: 'bg-amber-400 text-black',
  UR: 'bg-rose-600 text-white',
}

/** 卡图外框的光晕强度 —— 档位越高越亮。 */
export const RARITY_GLOW: Record<CardRarity, string> = {
  N: 'shadow-none',
  R: 'shadow-[0_0_24px_-4px_var(--color-sky-400)]',
  SR: 'shadow-[0_0_32px_-4px_var(--color-violet-500)]',
  SSR: 'shadow-[0_0_44px_-2px_var(--color-amber-400)]',
  UR: 'shadow-[0_0_60px_0px_var(--color-rose-600)]',
}

export function RarityBadge({
  tier,
  label,
  className,
}: {
  tier: CardRarity
  label: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border-2 border-border px-1.5 py-0.5 font-head text-[11px] leading-none font-bold tracking-wider ${RARITY_COLOR[tier]} ${className ?? ''}`}
    >
      {tier}
      <span className="font-normal opacity-80">· {label}</span>
    </span>
  )
}

/** 卡图。image 是不带扩展名的基址，拼 low.webp（PRD §14.1：列表只用 low，约 20KB）。 */
export function cardImage(image: string | null, quality: 'low' | 'high' = 'low') {
  if (!image) return null
  return `${image}/${quality}.${quality === 'low' ? 'webp' : 'png'}`
}

/**
 * 卡面。
 *
 * 固定宽高比 245:342（PRD §14.1）—— 卡图没加载出来时占位高度也不变，CLS < 0.1。
 * 没图（池子里有卡缺图）时不显示碎图标，给一块写明「无卡图」的占位。
 */
export function CardFace({
  image,
  name,
  tier,
  className,
}: {
  image: string | null
  name: string
  tier: CardRarity
  className?: string
}) {
  const src = cardImage(image)
  return (
    <div
      className={`relative aspect-[245/342] w-full overflow-hidden border-2 border-border bg-card ${RARITY_GLOW[tier]} ${className ?? ''}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          onError={(e) => {
            // 池子里实测有卡缺图（PRD §8.1 说剔除无图的，但兜底要有）
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="grid size-full place-items-center p-2 text-center text-xs text-muted-foreground">
          {name}
          <br />
          （无卡图）
        </div>
      )}
    </div>
  )
}
