import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@canaviri.com');
  const [password, setPassword] = useState('canaviri2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple authentication logic
    setTimeout(() => {
      if (email === 'admin@canaviri.com' && password === 'canaviri2026') {
        onLoginSuccess();
      } else {
        setError('Credenciales inválidas. Use admin@canaviri.com / canaviri2026');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.cardWrapper} className="login-card-wrapper">
        <div style={styles.leftPanel} className="login-left-panel">
          <div style={styles.branding}>
            <svg style={styles.logo} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2z" fill="#ffffff" />
              <circle cx="12" cy="14" r="3" fill="var(--primary)" />
            </svg>
            <h1 style={styles.brandTitle}>Canaviri</h1>
            <p style={styles.brandSubtitle}>PLATAFORMA DE PRODUCCIÓN DE CAÑIHUA</p>
          </div>
          <div style={styles.quoteBox}>
            <p style={styles.quote}>"Resguardando el patrimonio andino con precisión y tecnología agrícola sostenible."</p>
          </div>
        </div>

        <div style={styles.rightPanel} className="login-right-panel">
          <div style={styles.formHeader}>
            <h2 style={styles.title}>Iniciar Sesión</h2>
            <p style={styles.subtitle}>Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Usuario o Email</label>
              <input
                className="form-input"
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@canaviri.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input
                className="form-input"
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
              {loading ? 'Iniciando sesión...' : 'Ingresar al Portal'}
            </button>
          </form>

          <div style={styles.footer}>
            <span>Granja Agrícola Canaviri &copy; 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    padding: '24px',
  },
  cardWrapper: {
    display: 'flex',
    width: '1000px',
    maxWidth: '100%',
    minHeight: '600px',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    border: '1px solid var(--outline)',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'var(--primary)',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#ffffff',
    position: 'relative',
    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(139, 69, 19, 0.15) 0%, transparent 80%)',
  },
  branding: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logo: {
    width: '48px',
    height: '48px',
    marginBottom: '16px',
  },
  brandTitle: {
    fontFamily: 'var(--font-headline)',
    fontSize: '36px',
    color: '#ffffff',
    margin: 0,
  },
  brandSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.15em',
    color: 'var(--primary-light)',
    marginTop: '-4px',
  },
  quoteBox: {
    borderLeft: '2px solid var(--primary-light)',
    paddingLeft: '20px',
  },
  quote: {
    fontSize: '16px',
    fontStyle: 'italic',
    lineHeight: '1.6',
    color: 'var(--primary-light)',
  },
  rightPanel: {
    flex: 1.2,
    padding: '56px 48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  formHeader: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  submitBtn: {
    marginTop: '12px',
    width: '100%',
    padding: '14px',
    fontSize: '16px',
  },
  errorBox: {
    backgroundColor: 'var(--error-container)',
    color: '#93000a',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
