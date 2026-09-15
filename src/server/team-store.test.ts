import { beforeEach, describe, expect, it } from 'vitest'

import { addMember, createTeam, listTeams, __reset } from './team-store'

beforeEach(() => __reset())

describe('createTeam() —— 带初始成员的原子创建', () => {
  it('按传入顺序分配槽位 1..N', () => {
    const team = createTeam('t1', '队伍', [3, 6, 9])
    expect(team.members.map((m) => m.speciesId)).toEqual([3, 6, 9])
    expect(team.members.map((m) => m.position)).toEqual([1, 2, 3])
  })

  it('空成员列表 = 建空队', () => {
    const team = createTeam('t1', '队伍', [])
    expect(team.members).toEqual([])
  })

  it('超过 6 只抛 TEAM_FULL，且不留下半成品', () => {
    expect(() => createTeam('t1', '队伍', [1, 2, 3, 4, 5, 6, 7])).toThrow(
      'TEAM_FULL',
    )
    expect(listTeams('t1')).toEqual([])
  })

  it('图鉴外编号抛 UNKNOWN_SPECIES，且不留下半成品', () => {
    expect(() => createTeam('t1', '队伍', [1, 999999])).toThrow(
      'UNKNOWN_SPECIES:999999',
    )
    expect(listTeams('t1')).toEqual([])
  })

  it('初始成员里重复物种抛 DUPLICATE_SPECIES，且不留下半成品', () => {
    expect(() => createTeam('t1', '队伍', [3, 6, 3])).toThrow(
      'DUPLICATE_SPECIES:3',
    )
    expect(listTeams('t1')).toEqual([])
  })
})

describe('addMember() —— 领域规则「同一物种最多一只」', () => {
  it('加已在队里的物种抛 DUPLICATE_SPECIES', () => {
    const team = createTeam('t1', '队伍', [3])
    expect(() => addMember('t1', team.id, { speciesId: 3 })).toThrow(
      'DUPLICATE_SPECIES:3',
    )
  })

  it('加不同物种正常进入下一个空位', () => {
    const team = createTeam('t1', '队伍', [3])
    const member = addMember('t1', team.id, { speciesId: 6 })
    expect(member?.position).toBe(2)
  })
})