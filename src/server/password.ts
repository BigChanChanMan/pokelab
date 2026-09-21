import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * 密码哈希。用 Node 自带的 scrypt —— 不引 bcrypt/argon2 这类原生依赖
 * （DESIGN.md §3 的理由同样适用于此：少一个要编译的东西）。
 *
 * 存储格式是**自描述的**：`scrypt$N$r$p$salt$hash`。
 * 参数跟着哈希走，所以将来调 N 或换算法时，老密码仍然能验证。
 */

const N = 16384
const R = 8
const P = 1
const KEYLEN = 32

/** promisify(scrypt) 的类型丢了 options 参数，所以自己包一层。 */
function scryptKey(
  password: string,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptKey(password, salt, KEYLEN, { N, r: R, p: P })
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$')
}

/**
 * 校验密码。**任何异常都返回 false，绝不抛错** —— 和身份接缝同一个性质：
 * 坏数据不该让调用方崩，只该让它走「验证失败」那条路。
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [algo, n, r, p, saltB64, keyB64] = stored.split('$')
    if (algo !== 'scrypt') return false
    if (!n || !r || !p || !saltB64 || !keyB64) return false

    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(keyB64, 'base64')
    if (expected.length === 0) return false

    const actual = await scryptKey(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })

    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
