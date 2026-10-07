import SignInForm from '../../components/sign-in-form'

export default function SignInPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 42%, rgba(231, 240, 244, .78) 0, rgba(246, 248, 250, 0) 43%), var(--sd-background)' }}>
      <header style={{ zIndex: 1, width: '100%', minHeight: 76, padding: '0 clamp(20px, 5vw, 48px)', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(207, 217, 224, .72)', background: 'rgba(255, 255, 255, .58)' }}>
        <a href="/" aria-label="SimpleDesk Support" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, color: 'var(--sd-foreground)', textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, color: 'white', background: 'var(--sd-primary)', boxShadow: '0 2px 4px rgba(23, 43, 58, .12)', fontSize: 18 }}>◉</span>
          <strong style={{ fontSize: 16, letterSpacing: '-.35px' }}>SimpleDesk</strong>
          <span style={{ marginLeft: 2, paddingLeft: 14, borderLeft: '1px solid var(--sd-border)', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Support</span>
        </a>
      </header>
      <main style={{ zIndex: 1, flex: 1, display: 'grid', placeItems: 'center', padding: '64px 24px 72px' }}>
        <SignInForm />
      </main>
      <footer style={{ zIndex: 1, minHeight: 56, padding: '0 clamp(20px, 5vw, 48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(207, 217, 224, .72)', color: '#71818C', fontSize: 12 }}>
        <span style={{ color: 'var(--sd-muted-foreground)', fontWeight: 500 }}>SimpleDesk Support</span>
        <span>Secure sign-in</span>
      </footer>
    </div>
  )
}
