import { defineMiddleware } from 'astro:middleware'
import { getAuthUser } from './lib/auth'

const PUBLIC_ROUTES = ['/login', '/register']

const ADMIN_ROUTES = ['/admin']

const USER_ROUTES = ['/request-appointment']

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context
  const pathname = url.pathname

  const user = getAuthUser(cookies)

  locals.user = user

  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      const redirectTo = user.isAdmin ? '/admin' : '/request-appointment'
      return redirect(redirectTo)
    }

    return next()
  }

  if (pathname.startsWith('/api/')) {
    return next()
  }

  if (pathname === '/') {
    if (!user) {
      return redirect('/login')
    }

    const redirectTo = user.isAdmin ? '/admin' : '/request-appointment'
    return redirect(redirectTo)
  }

  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (!user) {
      return redirect('/login')
    }

    if (!user.isAdmin) {
      return redirect('/request-appointment')
    }
    return next()
  }

  if (USER_ROUTES.some(route => pathname.startsWith(route))) {
    if (!user) {
      return redirect('/login');
    }

    if (!user.isApproved && !user.isAdmin) {
      return redirect('/login?error=pending')
    }

    if (user.isAdmin) {
      return redirect('/admin')
    }

    return next();
  }

  if (!user) {
    return redirect('/login')
  }

  return next()
})