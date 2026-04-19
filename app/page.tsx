import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav ── */
        .lp-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 6%;
          height: 62px;
          border-bottom: 1px solid #f0f0f0;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .lp-logo {
          font-size: 18px;
          font-weight: 700;
          color: #111;
          text-decoration: none;
          letter-spacing: -.03em;
        }
        .lp-logo span { color: #555; font-weight: 400; }
        .lp-nav-links { display: flex; gap: 6px; align-items: center; }

        /* ── Hero ── */
        .lp-hero {
          max-width: 820px;
          margin: 0 auto;
          padding: 96px 6% 80px;
          text-align: center;
        }
        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: #666;
          background: #f5f5f5;
          border: 1px solid #ebebeb;
          padding: 5px 14px;
          border-radius: 20px;
          margin-bottom: 32px;
        }
        .lp-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
        }
        .lp-h1 {
          font-size: clamp(38px, 6.5vw, 62px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -.04em;
          color: #0a0a0a;
          margin-bottom: 24px;
        }
        .lp-h1 em { font-style: normal; color: #555; }
        .lp-sub {
          font-size: 17px;
          color: #666;
          line-height: 1.65;
          max-width: 500px;
          margin: 0 auto 40px;
          font-weight: 400;
        }
        .lp-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* ── Pipeline strip ── */
        .lp-pipeline {
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 40px 6%;
        }
        .lp-pipeline-inner {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }
        .lp-pipeline-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 20px;
        }
        .lp-pipeline-steps {
          display: flex;
          align-items: center;
          gap: 0;
          flex-wrap: wrap;
          justify-content: center;
          row-gap: 10px;
        }
        .lp-step {
          font-size: 12.5px;
          font-weight: 500;
          padding: 6px 15px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .lp-arrow { color: #d0d0d0; font-size: 13px; margin: 0 3px; }

        /* ── Features ── */
        .lp-features {
          max-width: 1020px;
          margin: 0 auto;
          padding: 80px 6% 80px;
        }
        .lp-section-head {
          text-align: center;
          margin-bottom: 56px;
        }
        .lp-section-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 12px;
        }
        .lp-section-title {
          font-size: clamp(24px, 3.5vw, 32px);
          font-weight: 700;
          letter-spacing: -.025em;
          color: #0a0a0a;
          line-height: 1.2;
        }
        .lp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1px;
          background: #ebebeb;
          border: 1px solid #ebebeb;
          border-radius: 20px;
          overflow: hidden;
        }
        .lp-card {
          background: #fff;
          padding: 32px 28px;
          transition: background 0.15s;
        }
        .lp-card:hover { background: #fafafa; }
        .lp-card-icon {
          font-size: 22px;
          margin-bottom: 14px;
          display: block;
          line-height: 1;
        }
        .lp-card h3 {
          font-size: 14.5px;
          font-weight: 650;
          color: #111;
          margin-bottom: 8px;
          letter-spacing: -.01em;
        }
        .lp-card p {
          font-size: 13px;
          color: #777;
          line-height: 1.65;
        }

        /* ── Social proof strip ── */
        .lp-social {
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 48px 6%;
          text-align: center;
        }
        .lp-social-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 28px;
        }
        .lp-stats {
          display: flex;
          justify-content: center;
          gap: 64px;
          flex-wrap: wrap;
        }
        .lp-stat-num {
          font-size: 28px;
          font-weight: 800;
          color: #111;
          letter-spacing: -.03em;
          line-height: 1;
          margin-bottom: 4px;
        }
        .lp-stat-label {
          font-size: 12px;
          color: #888;
          font-weight: 500;
        }

        /* ── CTA banner ── */
        .lp-banner {
          background: #0a0a0a;
          color: #fff;
          text-align: center;
          padding: 96px 6%;
        }
        .lp-banner h2 {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          letter-spacing: -.03em;
          margin-bottom: 12px;
          line-height: 1.1;
        }
        .lp-banner p {
          font-size: 15px;
          color: #888;
          margin-bottom: 36px;
          line-height: 1.6;
        }
        .lp-banner-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* ── Footer ── */
        .lp-footer {
          padding: 28px 6%;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: #bbb;
        }
        .lp-footer a { color: #aaa; text-decoration: none; }
        .lp-footer a:hover { color: #555; }

        /* ── Buttons ── */
        .btn-p {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #111;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          padding: 11px 24px;
          border-radius: 10px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          letter-spacing: -.01em;
          transition: opacity 0.15s;
        }
        .btn-p:hover { opacity: 0.82; text-decoration: none; }
        .btn-o {
          display: inline-flex;
          align-items: center;
          background: #fff;
          color: #111;
          font-size: 14px;
          font-weight: 500;
          padding: 11px 24px;
          border-radius: 10px;
          text-decoration: none;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          letter-spacing: -.01em;
          transition: border-color 0.15s, background 0.15s;
        }
        .btn-o:hover { border-color: #bbb; background: #fafafa; text-decoration: none; }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          color: #555;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 8px;
          transition: background 0.12s, color 0.12s;
        }
        .btn-ghost:hover { background: #f5f5f5; color: #111; text-decoration: none; }
        .btn-p-inv {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #fff;
          color: #111;
          font-size: 14px;
          font-weight: 600;
          padding: 11px 26px;
          border-radius: 10px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-p-inv:hover { opacity: 0.88; text-decoration: none; }
        .btn-o-inv {
          display: inline-flex;
          align-items: center;
          background: transparent;
          color: #aaa;
          font-size: 14px;
          font-weight: 500;
          padding: 11px 24px;
          border-radius: 10px;
          text-decoration: none;
          border: 1px solid #333;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-o-inv:hover { border-color: #666; color: #fff; text-decoration: none; }

        @media (max-width: 600px) {
          .lp-stats { gap: 32px; }
          .lp-footer { justify-content: center; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav">
        <a href="/" className="lp-logo">Weave<span> studio</span></a>
        <div className="lp-nav-links">
          <a href="#features" className="btn-ghost">Features</a>
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-p" style={{ fontSize: '13px', padding: '8px 18px' }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-badge">
          <span className="lp-badge-dot" />
          Studio management, built for photographers
        </div>
        <h1 className="lp-h1">
          Run your studio.<br />
          <em>Not a spreadsheet.</em>
        </h1>
        <p className="lp-sub">
          Sessions, invoicing, payments, contracts, staff, and clients —
          all in one clean workspace built for photography studios.
        </p>
        <div className="lp-cta">
          <Link href="/signup" className="btn-p">Start for free →</Link>
          <Link href="/login" className="btn-o">Sign in</Link>
        </div>
      </section>

      {/* Workflow pipeline */}
      <div className="lp-pipeline">
        <div className="lp-pipeline-inner">
          <p className="lp-pipeline-label">Full workflow coverage — from booking to delivery</p>
          <div className="lp-pipeline-steps">
            {[
              { label: 'Enquiry',        bg: '#f0f0f0',  color: '#555' },
              { label: 'Confirmed',      bg: '#e6f1fb',  color: '#185fa5' },
              { label: 'In progress',    bg: '#eeedfe',  color: '#534ab7' },
              { label: 'Colour grading', bg: '#fce8f3',  color: '#8b2d6e' },
              { label: 'Selecting',      bg: '#e8f4fc',  color: '#1a6a8a' },
              { label: 'Editing',        bg: '#faeeda',  color: '#854f0b' },
              { label: 'Delivered',      bg: '#eaf3de',  color: '#3b6d11' },
            ].map((step, i, arr) => (
              <span key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                <span className="lp-step" style={{ background: step.bg, color: step.color }}>
                  {step.label}
                </span>
                {i < arr.length - 1 && <span className="lp-arrow">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="lp-features" id="features">
        <div className="lp-section-head">
          <p className="lp-section-eyebrow">What&rsquo;s inside</p>
          <h2 className="lp-section-title">Everything your studio needs,<br />nothing it doesn&rsquo;t</h2>
        </div>
        <div className="lp-grid">
          {[
            {
              icon: '📅',
              title: 'Session management',
              desc: 'Studio, outdoor, and event sessions with type-aware fields. Track outfits, location, event details, and move through a full status pipeline.',
            },
            {
              icon: '🧾',
              title: 'Invoicing & payments',
              desc: 'Create invoices at intake, record deposits on the spot. Add extra charges post-selection, send PDF invoices, and track every payment.',
            },
            {
              icon: '👥',
              title: 'Clients & staff',
              desc: 'A proper client database. Assign photographers, colour graders, and editors to each stage and see full history per person.',
            },
            {
              icon: '📦',
              title: 'Packages & add-ons',
              desc: 'Define packages with base prices and optional add-ons. Invoices pre-fill from the package and recalculate live as you adjust.',
            },
            {
              icon: '🖼️',
              title: 'Selection tracking',
              desc: 'Record how many images a client selected. Flag extras above the base allowance and add charges to the invoice in one click.',
            },
            {
              icon: '📄',
              title: 'Contracts',
              desc: 'Generate, send, and store client contracts. Track signature status alongside the invoice for every session.',
            },
          ].map(f => (
            <div key={f.title} className="lp-card">
              <span className="lp-card-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="lp-social">
        <p className="lp-social-label">Built to replace the tools you&rsquo;re duct-taping together</p>
        <div className="lp-stats">
          {[
            { num: '1', label: 'Workspace — not 5 apps' },
            { num: '∞', label: 'Sessions, clients, staff' },
            { num: '0', label: 'Spreadsheets required' },
          ].map(s => (
            <div key={s.label}>
              <div className="lp-stat-num">{s.num}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <section className="lp-banner">
        <h2>Your studio deserves<br />better than a spreadsheet.</h2>
        <p>Get set up in minutes. No credit card required.</p>
        <div className="lp-banner-cta">
          <Link href="/signup" className="btn-p-inv">Start for free →</Link>
          <Link href="/login" className="btn-o-inv">Sign in</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} Weave by Creative Renaissance</span>
        <span>Built for photography studios.</span>
      </footer>
    </div>
  )
}
