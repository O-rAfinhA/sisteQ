import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Target } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { ModularSidebar } from './ModularSidebar'

vi.mock('@/assets/1616e31d08200cd9b4972fe7b1780df810c21f8a.png', () => ({
  default: { src: '/logo.png' },
}))

vi.mock('react-router', () => ({
  NavLink: ({
    to,
    end: _end,
    className,
    title,
    children,
  }: {
    to: string
    end?: boolean
    className?: string | ((args: { isActive: boolean }) => string)
    title?: string
    children?: any
  }) => {
    const resolvedClassName =
      typeof className === 'function' ? className({ isActive: false }) : className ?? undefined
    const resolvedChildren =
      typeof children === 'function' ? children({ isActive: false }) : (children ?? null)
    return (
      <a href={to} className={resolvedClassName} title={title}>
        {resolvedChildren}
      </a>
    )
  },
}))

describe('ModularSidebar (logo)', () => {
  it('renderiza a logo como link para home com estados de interação', () => {
    render(
      <ModularSidebar
        module={{
          id: 'gestao-estrategica',
          label: 'Estratégia',
          defaultPath: '/',
          icon: Target,
          sections: [],
        }}
      />,
    )

    const img = screen.getByAltText('SisteQ')
    const link = img.closest('a')
    expect(link).toBeTruthy()
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveClass('cursor-pointer')
    expect(link?.className).toContain('hover:opacity-90')
    expect(link?.className).toContain('active:opacity-80')
    expect(link?.className).toContain('focus-visible:ring-2')
  })

  it('mantém navegação para home quando o menu está recolhido', async () => {
    const user = userEvent.setup()
    render(
      <ModularSidebar
        module={{
          id: 'gestao-estrategica',
          label: 'Estratégia',
          defaultPath: '/',
          icon: Target,
          sections: [],
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /recolher/i }))
    const link = screen.getByTitle('Ir para a página inicial')
    expect(link).toHaveAttribute('href', '/')
  })
})
