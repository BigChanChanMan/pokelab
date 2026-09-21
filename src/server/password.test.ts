import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password'

describe('密码哈希', () => {
  it('同一个密码两次哈希结果不同（有盐）', async () => {
    const a = await hashPassword('correct horse battery staple')
    const b = await hashPassword('correct horse battery staple')
    expect(a).not.toBe(b)
  })

  it('哈希是自描述格式，参数跟着哈希走', async () => {
    const stored = await hashPassword('hunter2hunter2')
    expect(stored.startsWith('scrypt$')).toBe(true)
    // scrypt$N$r$p$salt$hash
    expect(stored.split('$')).toHaveLength(6)
  })

  it('正确密码通过，错误密码不通过', async () => {
    const stored = await hashPassword('hunter2hunter2')
    expect(await verifyPassword('hunter2hunter2', stored)).toBe(true)
    expect(await verifyPassword('hunter2hunter3', stored)).toBe(false)
  })

  it('损坏的哈希返回 false，不抛错', async () => {
    for (const bad of [
      '',
      'garbage',
      'scrypt$',
      'scrypt$1$2$3',
      'scrypt$16384$8$1$notbase64$notbase64',
      'bcrypt$16384$8$1$c2FsdA==$aGFzaA==',
    ]) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false)
    }
  })
})
