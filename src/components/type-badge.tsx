import { Badge } from '@/components/ui/badge'
import {
  TYPE_LABELS,
  TYPE_VARS,
  type PokemonType,
} from '@/lib/type-chart'
import { cn } from '@/lib/utils'

/**
 * 属性徽章 —— 全站复用次数最多的自定义组件。
 *
 * 它演示了 neobrutalism 组件的两种定制姿势：
 *  1. 通过 className 覆盖（这里是给每个属性注入不同的内联背景色）
 *  2. 通过 Badge 自带的 variant 轴
 * 因为 neobrutalism 的组件是「拷进你项目里的源码」，
 * 这里用 cn() 合并 className 的方式是最轻的定制路径。
 */
export function TypeBadge({
  type,
  className,
  showLabel = true,
}: {
  type: PokemonType
  className?: string
  showLabel?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 border-2 border-black px-2 font-head text-[11px] tracking-wide text-black uppercase',
        className
      )}
      style={{ backgroundColor: TYPE_VARS[type] }}
    >
      {showLabel ? TYPE_LABELS[type] : null}
      <span className="font-mono text-[10px] opacity-70">{type}</span>
    </Badge>
  )
}

export function TypeBadgeRow({
  types,
  className,
}: {
  types: PokemonType[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {types.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </div>
  )
}
