import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { messageOf } from '@/lib/errors'

/**
 * 登录与注册共用的表单。两个页面的字段、错误展示、显示密码开关完全一样，
 * 差别只在提交调什么、按钮写什么、底部放什么链接。
 */
export function CredentialForm({
  submitLabel,
  pendingLabel,
  autoComplete,
  onSubmit,
  footer,
}: {
  submitLabel: string
  pendingLabel: string
  autoComplete: 'current-password' | 'new-password'
  onSubmit: (handle: string, password: string) => Promise<void>
  footer: React.ReactNode
}) {
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await onSubmit(handle, password)
    } catch (err) {
      // 服务端抛的是错误码，这里翻成中文（lib/errors.ts）
      setError(messageOf(err))
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="handle">训练家名</Label>
        <Input
          id="handle"
          name="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">密码</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={autoComplete}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? '隐藏密码' : '显示密码'}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <Alert status="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  )
}

/**
 * 单字段表单（改密码用）。和 `CredentialForm` 分开是因为字段数不同：
 * 改密码有「当前密码」和「新密码」两个密码字段，硬塞进一个组件会变成
 * 一堆布尔开关。
 */
export function PasswordChangeForm({
  onSubmit,
}: {
  onSubmit: (current: string, next: string) => Promise<void>
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)
    setPending(true)
    try {
      await onSubmit(current, next)
      setDone(true)
      setCurrent('')
      setNext('')
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">当前密码</Label>
        <Input
          id="current"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="next">新密码</Label>
        <div className="relative">
          <Input
            id="next"
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? '隐藏密码' : '显示密码'}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <Alert status="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {done && (
        <Alert status="success">
          <AlertDescription>
            密码已更新。其他设备上的登录已失效。
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? '更新中…' : '更新密码'}
      </Button>
    </form>
  )
}
