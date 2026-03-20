import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getViewerProfile } from '@/lib/data/posts'
import { siteConfig } from '@/config'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { UserMenu } from '@/components/auth/user-menu'
import { Icons } from './Icons'
import { buttonVariants } from './ui/Button'

const Navbar = async () => {
  const viewer = await getViewerProfile()

  return (
    <header className='sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur'>
      <div className='container flex h-16 max-w-7xl items-center justify-between gap-4'>
        <Link href='/' className='flex items-center gap-3'>
          <Icons.logo className='h-8 w-8 sm:h-6 sm:w-6' />
          <div className='hidden md:block'>
            <p className='text-sm font-semibold tracking-tight text-zinc-900'>
              {siteConfig.name}
            </p>
            <p className='text-xs text-muted-foreground'>Track public predictions</p>
          </div>
        </Link>
        <nav className='hidden items-center gap-6 md:flex'>
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              className='text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900'
              href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className='flex items-center gap-3'>
          <Link
            href='/post/create'
            className={buttonVariants({
              variant: 'outline',
              className: 'hidden md:inline-flex',
            })}>
            <Plus className='mr-2 h-4 w-4' />
            New post
          </Link>
          {viewer ? (
            <UserMenu viewer={viewer} />
          ) : (
            <GoogleAuthButton className='h-10 px-4' />
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
