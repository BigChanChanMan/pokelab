import { createFileRoute, Link } from '@tanstack/react-router'
import { LockIcon, SparklesIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CardFace, RarityBadge } from '@/components/rarity'
import { TiltCard } from '@/components/tilt-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { can } from '@/lib/capabilities'
import { messageOf } from '@/lib/errors'
import { RARITY_LABEL } from '@/lib/gacha'
import { BACK_TILT_SCALE, MAX_TILT_DEG } from '@/lib/tilt'
import { TIER_LABEL } from '@/lib/tiers'
import { drawToday, readAlbum, type AlbumData, type DrawView } from '@/server/gacha'

/**
 * 每日一抽 · 主界面（PRD §10 的 P1）。
 *
 * 三条设计约束来自 PRD：
 *   - 结果由**日期**决定，不受设备和本地数据影响 —— 这是本功能的卖点
 *   - 翻牌动画 1.2–2.0 秒，够仪式感又不让人等
 *   - 保底触发要**如实标注**，不隐瞒
 *
 * ⚠️ 下面那个 `can()` 判断**不是访问控制**，只是别让注册用户白点。
 * 真正的防线是 `drawToday` 上挂的 `requireCapability('gacha.draw')`。
 */
export const Route = createFileRoute('/_console/gacha/')({
  loader: async () => ({ album: await readAlbum() }),
  component: GachaPage,
})

/** 翻牌动画的第一段：卡背脉冲 → 白光（PRD §P1-02，脉冲 300 → 白光 200） */
const FLASH_MS = 320

/**
 * 卡背图。**外链**到宝可梦官方的素材 CDN，没有本地副本 —— 这份资源是他们的，
 * 拷进仓库就是再分发，而热链只是展示（和卡图走 TCGdex 一个道理）。
 * 代价是路径不保证稳定，所以按钮上留了黄底 + 「?」作兜底。
 */
const CARD_BACK = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg'

function GachaPage() {
  const { trainer } = Route.useRouteContext()
  const initial = Route.useLoaderData().album

  const [album, setAlbum] = useState<AlbumData>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isVip = can(trainer, 'gacha.draw').allowed
  const today = album.todayDraw

  async function draw() {
    if (busy || today) return
    setBusy(true)
    setError(null)
    try {
      // 服务端说了算的「今天」。这里**不传日期** —— 传了就能刷历史。
      await drawToday()
      // 重新读一遍，让统计和连续天数一起刷新
      setAlbum(await readAlbum())
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight">每日一抽</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          每天一张，全球同一张。结果由日期决定，改本地代码也改不了今天抽什么。
        </p>
      </header>

      {error && (
        <Alert status="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isVip && <LockedToday album={album} trainerTier={trainer.tier} />}

      {isVip && (
        <Stage
          album={album}
          busy={busy}
          revealed={!!today}
          result={today}
          onDraw={draw}
        />
      )}

      <PityBars album={album} />
    </div>
  )
}

/**
 * 抽卡舞台。未抽显示卡背，已抽显示卡面。
 *
 * 动画状态是**本地**的（revealed 由 loader 数据决定），所以刷新页面时
 * 已抽的那张直接是翻开状态，不会重播动画 —— 那是 PRD §P1-01 的要求。
 */
function Stage({
  album,
  busy,
  revealed,
  result,
  onDraw,
}: {
  album: AlbumData
  busy: boolean
  revealed: boolean
  result: DrawView | null
  onDraw: () => void
}) {
  const [flipped, setFlipped] = useState(revealed)

  // loader 数据变化后同步（抽完卡 setAlbum 会走到这里）
  useEffect(() => {
    if (!revealed) setFlipped(false)
    else {
      const t = setTimeout(() => setFlipped(true), FLASH_MS)
      return () => clearTimeout(t)
    }
  }, [revealed])

  const showFront = revealed || flipped

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-xs tracking-widest text-muted-foreground uppercase">
        {album.today}
      </div>

      <div className="w-56 sm:w-64">
        {showFront && result ? (
          <TiltCard>
            <CardFace
              image={result.card.image}
              name={result.card.name}
              tier={result.tier}
            />
          </TiltCard>
        ) : (
          // 卡背的倾斜弱一档 —— 它是「这里可以点」的暗示，不是欣赏对象。
          // 原先的 `hover:scale-[1.02]` 去掉了：它就是这套反馈的粗糙版本，
          // 现在由倾斜接替；两者叠在一起会让卡背在指针下同时放大又转动，很吵。
          <TiltCard maxDeg={MAX_TILT_DEG * BACK_TILT_SCALE}>
            <button
              type="button"
              onClick={onDraw}
              disabled={busy}
              aria-label="开启今日卡包"
              className="relative grid aspect-[245/342] w-full place-items-center border-2 border-border bg-primary text-primary-foreground disabled:opacity-60"
            >
              {/* 卡背的兜底：这张图是**外链**（宝可梦官方的素材 CDN），
                  路径无版本、随时可能变，所以黄色底 + 「?」始终垫在下面。
                  图能加载就盖住它，加载不出来就退回现在这个样子 ——
                  不至于变成一个点得动但什么都没有的空框。 */}
              <span className="font-head text-6xl">?</span>
              <img
                src={CARD_BACK}
                alt=""
                className="absolute inset-0 size-full object-cover"
                ref={(el) => {
                  // SSR 下图片在 HTML 解析阶段就开始加载 —— 如果那时就失败，
                  // error 事件会在 React 完成 hydration、挂上 onError 之前触发，
                  // 于是处理器永远不会跑，破图图标留在角上。这里补一次挂载检查。
                  if (el?.complete && el.naturalWidth === 0) {
                    el.style.display = 'none'
                  }
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </button>
          </TiltCard>
        )}
      </div>

      {result && (
        <div className="w-full max-w-md space-y-3 text-center">
          <h3 className="font-head text-xl">{result.card.name}</h3>
          {result.card.setName && (
            <p className="text-xs text-muted-foreground">{result.card.setName}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RarityBadge tier={result.tier} label={RARITY_LABEL[result.tier]} />
            {result.card.rarity && (
              <span className="text-[11px] text-muted-foreground">
                {result.card.rarity}
              </span>
            )}
            {result.isNew ? (
              <span className="border-2 border-border bg-primary px-1.5 py-0.5 text-[11px] font-bold">
                NEW 首次收集
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                已拥有 ×{result.owned}
              </span>
            )}
            {result.pity && (
              <span className="border-2 border-border bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-black">
                保底触发
              </span>
            )}
          </div>
        </div>
      )}

      {!revealed && (
        <Button onClick={onDraw} disabled={busy} size="lg">
          <SparklesIcon /> {busy ? '开启中…' : '开启今日卡包'}
        </Button>
      )}

      {revealed && <Countdown msLeft={album.msLeft} />}

      <p className="max-w-md text-center text-xs text-muted-foreground">
        同一天，全世界抽到的是<strong>同一张卡</strong>。详见{' '}
        <Link to="/gacha/rates" className="underline underline-offset-4">
          概率公示
        </Link>
        。
      </p>
    </div>
  )
}

/** 倒计时。归零时刷新页面数据，自动切回可抽状态（PRD §P1-05）。 */
function Countdown({ msLeft }: { msLeft: number }) {
  const [ms, setMs] = useState(msLeft)

  useEffect(() => {
    setMs(msLeft)
    const t = setInterval(() => setMs((v) => Math.max(0, v - 1000)), 1000)
    return () => clearInterval(t)
  }, [msLeft])

  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <p className="text-sm text-muted-foreground">
      距离下一次抽卡{' '}
      <span className="font-head tabular-nums">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  )
}

/**
 * 锁定态。**手写而不是用 `FeaturePage`** ——
 * 那个组件不为单个调用方扩展，而这里要多一扇「查看我的抽卡册」的半开门
 * （降级之后册子还看得见，DESIGN.md §6.4）。
 */
function LockedToday({
  album,
  trainerTier,
}: {
  album: AlbumData
  trainerTier: string
}) {
  const hasAlbum = album.stats.total > 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LockIcon className="size-5" /> 今日卡包
        </CardTitle>
        <CardDescription>
          这是 {TIER_LABEL.vip} 能力。当前身份：
          {TIER_LABEL[trainerTier as keyof typeof TIER_LABEL]}。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button render={<Link to="/pricing" />} nativeButton={false}>
          去升级
        </Button>
        {hasAlbum && (
          <Button
            variant="outline"
            render={<Link to="/gacha/album" />}
            nativeButton={false}
          >
            查看我的抽卡册（{album.stats.total} 张）
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** 两条保底进度条（PRD §P1-04）。接近触发时高亮。 */
export function PityBars({ album }: { album: AlbumData }) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
      <PityBar
        label="SR 保底"
        cur={album.pity.sinceSR}
        max={album.srPity}
      />
      <PityBar
        label="SSR 保底"
        cur={album.pity.sinceSSR}
        max={album.ssrPity}
      />
      <p className="text-center text-[11px] text-muted-foreground">
        保底计数只由日期决定，所以全球所有训练家的进度是一致的。
      </p>
    </div>
  )
}

function PityBar({ label, cur, max }: { label: string; cur: number; max: number }) {
  const due = cur >= max - 1
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span>
          {label}
          {due && <b className="ml-1 text-amber-600">即将触发</b>}
        </span>
        <span className="font-head tabular-nums">
          {cur} / {max}
        </span>
      </div>
      <Progress value={(cur / max) * 100} />
    </div>
  )
}
