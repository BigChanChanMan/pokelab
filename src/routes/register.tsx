import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Mascot } from 'page-mascot'

import { CredentialForm } from '@/components/credential-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { register } from '@/server/auth'
import { getTrainer } from '@/server/trainer'

/**
 * 注册页。**两套壳都不套** —— 和登录页同构。
 *
 * 注册是「注册训练家」这一档的**唯一**来源：它不需要任何人授予。
 * VIP 和管理员各有各的路径（升级码 / 管理员授予 / seed）。
 */
export const Route = createFileRoute('/register')({
  loader: async () => {
    const trainer = await getTrainer()
    if (trainer.id) throw redirect({ to: '/dashboard' })
    return {}
  },
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Mascot
          className="mx-auto"
          directions="/mascots/fox-pixel-directions.webp"
          reactions="/mascots/fox-pixel-reactions.webp"
          size={96}
          label="吉祥物"
        />
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          POKÉ<span className="bg-primary px-1">LAB</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">注册</CardTitle>
          <CardDescription>
            训练家名 2–20 个字，密码至少 8 位。注册即可建队伍、记对战。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CredentialForm
            submitLabel="注册并进入"
            pendingLabel="创建中…"
            autoComplete="new-password"
            onSubmit={async (handle, password) => {
              await register({ data: { handle, password } })
              window.location.href = '/dashboard'
            }}
            footer={
              <p className="pt-1 text-center text-sm">
                已经有账号了？{' '}
                <Link to="/login" className="underline underline-offset-4">
                  去登录
                </Link>
              </p>
            }
          />
        </CardContent>
      </Card>

      <Link to="/" className="text-center text-sm underline underline-offset-4">
        先随便逛逛 →
      </Link>
    </div>
  )
}
