import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low',
  variant?: 'square' | 'square_alt' | 'header' | 'footer',
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, variant, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  function getImgSrc(): string {
    switch (variant) {
      case 'footer':
        return '/footer.png'
      case 'header':
        return '/header.png';
      case 'square_alt':
        return '/square_alt.png';
      case 'square':
      default:
        return '/square.png';
    }
  }

  return (
    /* eslint-disable @next/next/no-img-element */
    <img
      alt="V3NTUS Logo"
      loading={loading}
      fetchPriority={priority}
      decoding="async"
      className={className}
      src={getImgSrc()}
    />
  )
}
