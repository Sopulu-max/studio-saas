import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

export default async function LandingPage() {
  const context = await getStudioContext()
  if (!('error' in context)) redirect('/dashboard')
  else if (context.error === 'Studio not found') redirect('/onboarding')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .land-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5%;
          height: 60px;
          border-bottom: 0.5px solid #e5e5e5;
          background: white;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .land-logo {
          font-size: 17px;
          font-weight: 600;
          color: #111;
          text-decoration: none;
          letter-spacing: -.02em;
        }
        .land-nav-links { display: flex; gap: 10px; align-items: center; }

        .land-hero {
          max-width: 760px;
          margin: 0 auto;
          padding: 100px 5% 80px;
          text-align: center;
        }
        .land-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #888;
          background: #f4f4f4;
          padding: 5px 14px;
          border-radius: 20px;
          margin-bottom: 28px;
        }
        .land-h1 {
          font-size: clamp(36px, 6vw, 56px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -.03em;
          color: #111;
          margin-bottom: 20px;
        }
        .land-sub {
          font-size: 18px;
          color: #666;
          line-height: 1.6;
          max-width: 520px;
          margin: 0 auto 40px;
        }
        .land-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .land-features {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 5% 100px;
        }
        .land-section-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #888;
          text-align: center;
          margin-bottom: 48px;
        }
        .land-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .land-card {
          background: white;
          border: 0.5px solid #e5e5e5;
          border-radius: 16px;
          padding: 28px;
        }
        .land-card-icon {
          font-size: 24px;
          margin-bottom: 16px;
          display: block;
        }
        .land-card h3 {
          font-size: 15px;
          font-weight: 600;
          color: #111;
          margin-bottom: 8px;
        }
        .land-card p {
          font-size: 13px;
          color: #888;
          line-height: 1.65;
        }

        .land-pipeline {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 5% 100px;
        }
        .land-pipeline-steps {
          display: flex;
          align-items: center;
          gap: 0;
          flex-wrap: wrap;
          justify-content: center;
          row-gap: 12px;
        }
        .land-step {
          font-size: 13px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .land-arrow {
          color: #ccc;
          font-size: 14px;
          margin: 0 4px;
        }

        .land-cta-banner {
          background: #111;
          color: white;
          text-align: center;
          padding: 80px 5%;
        }
        .land-cta-banner h2 {
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          letter-spacing: -.02em;
          margin-bottom: 14px;
        }
        .land-cta-banner p {
          font-size: 16px;
          color: #aaa;
          margin-bottom: 32px;
        }

        .land-footer {
          padding: 24px 5%;
          border-top: 0.5px solid #e5e5e5;
          text-align: center;
          font-size: 12px;
          color: #bbb;
        }

        .btn-primary {
          display: inline-block;
          background: #111;
          color: white;
          font-size: 14px;
          font-weight: 500;
          padding: 11px 28px;
          border-radius: 10px;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
        .btn-secondary {
          display: inline-block;
          background: white;
          color: #111;
          font-size: 14px;
          font-weight: 500;
          padding: 11px 28px;
          border-radius: 10px;
          text-decoration: none;
          border: 0.5px solid #d5d5d5;
        }
        .btn-ghost {
          display: inline-block;
          color: #555;
          font-size: 14px;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 8px;
        }
        .btn-sm-primary {
          display: inline-block;
          background: white;
          color: #111;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 20px;
          border-radius: 8px;
          text-decoration: none;
          border: none;
        }
      `}</style>

      {/* Nav */}
      <nav className="land-nav">
        <a href="/" className="land-logo">Weave</a>
        <div className="land-nav-links">
          <a href="#features" className="btn-ghost">Features</a>
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="land-hero">
        <span className="land-eyebrow">Studio management, simplified</span>
        <h1 className="land-h1">Run your studio.<br />Not a spreadsheet.</h1>
        <p className="land-sub">
          Everything a photography studio needs — sessions, invoicing, payments,
          staff, and client management — in one clean workspace.
        </p>
        <div className="land-cta">
          <Link href="/signup" className="btn-primary">Get started free</Link>
          <Link href="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      {/* Status pipeline visual */}
      <section className="land-pipeline">
        <p className="land-section-label">Full workflow coverage</p>
        <div className="land-pipeline-steps">
          {[
            { label: 'Confirmed',       bg: '#e6f1fb', color: '#185fa5' },
            { label: 'In progress',     bg: '#eeedfe', color: '#534ab7' },
            { label: 'Colour grading',  bg: '#fce8f3', color: '#8b2d6e' },
            { label: 'Selecting',       bg: '#e8f4fc', color: '#1a6a8a' },
            { label: 'Editing',         bg: '#faeeda', color: '#854f0b' },
            { label: 'Delivered',       bg: '#eaf3de', color: '#3b6d11' },
          ].map((step, i, arr) => (
            <span key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span className="land-step" style={{ background: step.bg, color: step.color }}>
                {step.label}
              </span>
              {i < arr.length - 1 && <span className="land-arrow">→</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="land-features" id="features">
        <p className="land-section-label">What's inside</p>
        <div className="land-grid">
          {[
            {
              icon: '📅',
              title: 'Session management',
              desc: 'Studio, outdoor, and event sessions with type-aware fields. Track outfits, location, event details, and move through a full status pipeline as the work progresses.',
            },
            {
              icon: '🧾',
              title: 'Invoicing & payments',
              desc: 'Create an invoice at intake and record deposits on the spot. Add extra charges post-selection, send PDF invoices to clients, and track every payment.',
            },
            {
              icon: '👥',
              title: 'Clients & staff',
              desc: 'A proper client database, not a contact list. Assign photographers, colour graders, and editors to each stage and see the full history per person.',
            },
            {
              icon: '📦',
              title: 'Packages & add-ons',
              desc: 'Define packages with base prices and attach optional add-ons. Invoices pre-fill from the package and recalculate live as you adjust.',
            },
            {
              icon: '🖼️',
              title: 'Selection tracking',
              desc: 'Record how many images a client selected. Automatically flag extra images above the base allowance and add extra charges to the invoice in one click.',
            },
            {
              icon: '📄',
              title: 'Contracts',
              desc: 'Generate, send, and store client contracts. Track signature status and reference them alongside the invoice for every session.',
            },
          ].map(f => (
            <div key={f.title} className="land-card">
              <span className="land-card-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="land-cta-banner">
        <h2>Your studio deserves better than a spreadsheet.</h2>
        <p>Get set up in minutes. No credit card required.</p>
        <Link href="/signup" className="btn-sm-primary">Start for free →</Link>
      </section>

      {/* Footer */}
      <footer className="land-footer">
        <p>© {new Date().getFullYear()} Weave by Creative Renaissance. Built for photography studios.</p>
      </footer>
    </>
  )
}
