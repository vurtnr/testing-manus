import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword } from '@/lib/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const sql = getDb();
    const [user] = await sql`
      SELECT id, email, password_hash, display_name, is_demo,
             failed_login_attempts, locked_until
      FROM users WHERE email = ${email}
    `;

    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // Check lockout (demo accounts exempt)
    if (!user.is_demo && user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: '登录尝试过多，请稍后再试' }, { status: 429 });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      // Increment failed attempts (skip for demo)
      if (!user.is_demo) {
        const attempts = (user.failed_login_attempts ?? 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await sql`
            UPDATE users SET failed_login_attempts = ${attempts},
            locked_until = NOW() + INTERVAL '${LOCKOUT_MINUTES} minutes'
            WHERE id = ${user.id}
          `;
        } else {
          await sql`
            UPDATE users SET failed_login_attempts = ${attempts} WHERE id = ${user.id}
          `;
        }
      }
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // Reset failed attempts on success
    await sql`
      UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${user.id}
    `;

    const tokenPayload = { sub: user.id, email: user.email, name: user.display_name ?? user.email };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 min
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
