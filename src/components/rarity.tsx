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

/**
 * 卡图外框的光晕强度 —— 档位越高越亮。
 *
 * 这是**发光**（box-shadow 的彩色层），和下面 `GLARE_STRENGTH` 那个**表面反光**
 * 是两回事：前者是卡自己发的光，后者是打在卡面上的光。两者都按档位递增，
 * 但用途不同，别合并。
 */
export const RARITY_GLOW: Record<CardRarity, string | null> = {
  N: null, // 普通卡不发光
  R: '0 0 24px -4px var(--color-sky-400)',
  SR: '0 0 32px -4px var(--color-violet-500)',
  SSR: '0 0 44px -2px var(--color-amber-400)',
  UR: '0 0 60px 0 var(--color-rose-600)',
}

/**
 * 表面反光的强度 —— 档位越高，打在卡面上的高光越亮。
 *
 * 倾斜角度**不**按档位分级（那是物理属性：一张卡有多厚不因稀有度而变），
 * 分级的只有这层光泽 —— 它是价值信号。见 issue #25。
 */
const GLARE_STRENGTH: Record<CardRarity, string> = {
  N: '28%',
  R: '40%',
  SR: '52%',
  SSR: '66%',
  UR: '80%',
}

/**
 * 卡片的 box-shadow：硬偏移阴影 + 档位光晕。
 *
 * 偏移基准 4px 就是 neobrutalism 的 `--shadow-md`，再叠加 `--tilt-shadow-*` ——
 * 指针往左上时阴影往右下，卡片像被抬起来。不倾斜的调用点拿到默认 0px，
 * 于是和以前完全一样。
 */
function cardShadow(tier: CardRarity): string {
  const offset =
    'calc(4px + var(--tilt-shadow-x, 0px)) calc(4px + var(--tilt-shadow-y, 0px)) 0 0 var(--border)'
  const glow = RARITY_GLOW[tier]
  return glow ? `${offset}, ${glow}` : offset
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
 *
 * 卡图与高光**必须同层**：这一层有 `overflow-hidden`，把高光拆到兄弟节点会被
 * 圆角/裁切各自为政，而且 3D 倾斜下会错位。
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
      className={`card-face relative aspect-[245/342] w-full overflow-hidden border-2 border-border bg-card ${className ?? ''}`}
      style={{ boxShadow: cardShadow(tier) }}
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
      {/* 表面反光。不倾斜时 --tilt-glare-opacity 是 0，完全看不见。 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at var(--tilt-glare-x, 50%) var(--tilt-glare-y, 50%), rgba(255,255,255,0.9), transparent 60%)`,
          opacity: `calc(var(--tilt-glare-opacity, 0) * ${GLARE_STRENGTH[tier]})`,
        }}
      />
    </div>
  )
}
