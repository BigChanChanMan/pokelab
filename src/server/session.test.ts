import { describe, expect, it } from 'vitest'

import { sign, verify } from './session'

describe('会话签名', () => {
  it('签了能验回来', () => {
    const token = sign({ uid: 'tr_1', pv: 1 })
    expect(verify(token)).toEqual({ uid: 'tr_1', pv: 1 })
  })

  it('★ 载荷被篡改后验签失败', () => {
    // 这条是本次改动的核心验收：之前的实现完全不验签，
    // 手动把 cookie 改成 {"tier":"vip"} 就是 VIP。
    const token = sign({ uid: 'tr_1', pv: 1 })
    const [body, sig] = token.split('.')

    const forged = Buffer.from(
      JSON.stringify({ uid: 'tr_admin', pv: 1 }),
    ).toString('base64url')

    expect(verify(`${forged}.${sig}`)).toBeNull()
    // 原载荷配伪造签名同样不行
    expect(verify(`${body}.${'A'.repeat(sig.length)}`)).toBeNull()
  })

  it('版本号被改大也验不过（改密码踢人不能被绕过）', () => {
    const token = sign({ uid: 'tr_1', pv: 1 })
    const forged = Buffer.from(JSON.stringify({ uid: 'tr_1', pv: 99 })).toString(
      'base64url',
    )
    expect(verify(`${forged}.${token.split('.')[1]}`)).toBeNull()
  })

  it('垃圾输入一律返回 null，不抛错', () => {
    for (const bad of [
      undefined,
      '',
      '.',
      'nodot',
      'a.b.c',
      'e30=.AAAA',
      Buffer.from('{"uid":"x","pv":1}').toString('base64url'),
    ]) {
      expect(verify(bad)).toBeNull()
    }
  })

  it('签名有效但载荷缺字段 → null', () => {
    expect(verify(sign({ uid: 'x' } as never))).toBeNull()
  })
})
