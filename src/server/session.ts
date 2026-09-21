import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * 会话 cookie 的签名与校验。
 *
 * 载荷是 `base64url(JSON) + "." + HMAC-SHA256`。约 30 行，替代一个 auth 库
 * （DESIGN.md §3 论证过：本项目不需要 OAuth / 邮箱验证 / 多设备会话管理）。
 *
 * ⚠️ 这个模块的存在本身就是一次**漏洞修复**：之前的实现完全不验签，
 * 注释里写着「桩数据不值得签名」—— 意味着任何人手动把 cookie 改成
 * `{"tier":"vip"}` 就是 VIP。在补上签名之前，「等级由系统判定」是假的。
 */

export interface SessionPayload {
  /** 训练家 id */
  uid: string
  /** 签发时的 passwordVersion —— 与库中不等就当访客（改密码踢掉旧会话） */
  pv: number
}

function resolveSecret(): string {
  const s = process.env.SESSION_SECRET
  if (s && s.length >= 32) return s
  if (process.env.NODE_ENV === 'production') {
    // 生产环境绝不接受兜底值：启动即失败，好过带着可预测的密钥上线
    throw new Error('SESSION_SECRET 未设置或过短（需 32 字节以上）')
  }
  console.warn(
    '[pokelab] SESSION_SECRET 未设置，开发环境使用固定兜底值 —— 绝不要这样上线',
  )
  return 'pokelab-dev-only-insecure-secret-32-bytes'
}

const SECRET = resolveSecret()

const mac = (body: string) =>
  createHmac('sha256', SECRET).update(body).digest('base64url')

export function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${mac(body)}`
}

/** 验签。验不过一律返回 null（调用方降级为访客），绝不抛错。 */
export function verify(raw: string | undefined): SessionPayload | null {
  if (!raw) return null

  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)

  const expected = mac(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as Partial<SessionPayload>
    if (typeof parsed?.uid !== 'string' || typeof parsed?.pv !== 'number') {
      return null
    }
    return { uid: parsed.uid, pv: parsed.pv }
  } catch {
    return null
  }
}
