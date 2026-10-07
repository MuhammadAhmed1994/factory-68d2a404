import Link from 'next/link'

export default function Home() {
  return (
    <main className="welcome">
      <header className="topbar" aria-label="SimpleDesk">
        <Link className="wordmark" href="/" aria-label="SimpleDesk home">
          <span className="wordmark-mark" aria-hidden="true">S</span>
          <span>SimpleDesk</span>
        </Link>
        <span className="topbar-note">Support, made clearer.</span>
      </header>

      <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="eyebrow">SUPPORT, WITHOUT THE NOISE</p>
          <h1 id="welcome-title">A clearer way to take care of support.</h1>
          <p className="hero-description">
            SimpleDesk brings support teams and customers together to manage requests
            with clarity, from the first ticket to its resolution.
          </p>
          <Link className="primary-link" href="/sign-in">
            Sign in <span aria-hidden="true">→</span>
          </Link>
        </div>

        <aside className="hero-note" aria-label="SimpleDesk principles">
          <span className="note-rule" aria-hidden="true" />
          <p>Every request has an owner.</p>
          <p>Every next step is clear.</p>
        </aside>
      </section>

      <footer className="footer">
        <span>SimpleDesk Support</span>
        <span>Thoughtful support, one request at a time.</span>
      </footer>
    </main>
  )
}
