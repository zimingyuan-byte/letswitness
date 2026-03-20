'use client'

import { FC, ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

const Providers: FC<LayoutProps> = ({ children }) => {
  return <>{children}</>
}

export default Providers
