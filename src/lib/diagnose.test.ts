import { describe, expect, it } from 'vitest'

import { diagnose } from './diagnose'
import type { Team } from './team'

/**
 * 用一支**刻意失衡**的队伍测：6 只全是虫/草，全弱火、全弱飞。
 * 同时它 4 只都是「均衡」职能 —— 三个诊断项一次全中。
 *
 * 妙蛙花 (grass/poison) 80
 * 派拉斯特 (bug/grass) 30   ← 火 4 倍
 * 巴大蝶 (bug/flying) 70
 * 飞天螳螂 (bug/flying) 105
 * 凯罗斯 (bug) 85
 * 蔓藤怪 (grass) 60
 */
const team = (speciesIds: number[]): Team => ({
  id: 't1',
  trainerId: 'tr1',
  name: '虫草大队',
  createdAt: 1,
  members: speciesIds.map((id, i) => ({
    id: `m${i}`,
    speciesId: id,
    ability: null,
    item: null,
    nature: null,
    teraType: null,
    evs: null,
    moves: [],
    position: i + 1,
  })),
})

const IMBALANCED = [3, 47, 12, 123, 127, 114]

describe('diagnose()', () => {
  it('找出叠加弱点：虫草大队全员弱火/弱飞', () => {
    const d = diagnose(team(IMBALANCED))
    const types = d.weakSpots.map((w) => w.type)
    expect(types).toContain('fire')
    expect(types).toContain('flying')

    const fire = d.weakSpots.find((w) => w.type === 'fire')!
    expect(fire.count).toBe(6)
    // 派拉斯特是 bug/grass，火打它 4 倍 —— 这就是「叠加」的可操作含义
    expect(fire.fatal).toBe(1)
    expect(fire.members).toContain('派拉斯特')
  })

  it('找出速度线缺口：蔓藤怪 60 到派拉斯特 30 之间断了 30', () => {
    const d = diagnose(team(IMBALANCED))
    expect(d.speed.members[0]).toEqual({ name: '飞天螳螂', speed: 105 })
    // 排序后是 105 / 85 / 80 / 70 / 60 / 30，只有最后一段 ≥ 25
    expect(d.speed.gaps).toEqual([{ from: 60, to: 30, size: 30 }])
  })

  it('找出重复职能：4 只均衡', () => {
    const d = diagnose(team(IMBALANCED))
    expect(d.clumps).toHaveLength(1)
    expect(d.clumps[0].role).toBe('balanced')
    expect(d.clumps[0].members).toHaveLength(4)
  })

  it('均衡的队伍不报结构性漏洞', () => {
    // 喷火龙/水箭龟/妙蛙花/皮卡丘/卡比兽/耿鬼 —— 属性铺开
    const d = diagnose(team([6, 9, 3, 25, 143, 94]))
    expect(d.weakSpots.every((w) => w.count < 4)).toBe(true)
    expect(d.insufficient).toBe(false)
  })

  it('成员太少时结论不可信', () => {
    expect(diagnose(team([3, 6])).insufficient).toBe(true)
  })

  it('空队伍不炸', () => {
    const d = diagnose(team([]))
    expect(d.weakSpots).toEqual([])
    expect(d.speed.members).toEqual([])
    expect(d.insufficient).toBe(true)
  })
})
