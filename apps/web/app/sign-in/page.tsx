import SignInForm from '../../components/sign-in-form'

export default function SignInPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--sd-foreground)', background: 'radial-gradient(ellipse at 50% 42%, rgba(231, 240, 244, .78) 0, rgba(246, 248, 250, 0) 43%), var(--sd-background)' }}>
      <header style={{ minHeight: 76, padding: '0 48px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(207, 217, 224, .72)', background: 'rgba(255, 255, 255, .58)' }}>
        <a href="/" aria-label="SimpleDesk Support" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, color: 'inherit', textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, color: '#fff', background: 'var(--sd-primary)', fontSize: 18, boxShadow: '0 2px 4px rgba(23, 43, 58, .12)' }}>S</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>SimpleDesk</span>
          <span style={{ marginLeft: 2, paddingLeft: 14, borderLeft: '1px solid var(--sd-border)', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Support</span>
        </a>
      </header>
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '64px 24px 72px' }}>
        <SignInForm />
      </main>
      <footer style={{ minHeight: 56, padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(207, 217, 224, .72)', color: '#71818C', fontSize: 12 }}>
        <span style={{ color: 'var(--sd-muted-foreground)', fontWeight: 500 }}>SimpleDesk Support</span>
        <span>Secure sign-in</span>
      </footer>
    </div>
  )
}
