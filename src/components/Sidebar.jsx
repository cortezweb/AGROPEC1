import React from 'react';

export default function Sidebar({ activeView, onViewChange, onLogout }) {
  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.logoContainer}>
          <svg style={styles.logo} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2z" fill="var(--primary)" />
            <circle cx="12" cy="14" r="3" fill="#ffffff" />
          </svg>
        </div>
        <div style={styles.brandName}>
          <h2 style={styles.brandTitle}>CANAVIRI</h2>
          <span style={styles.brandSubtitle}>Sistema de Cañihua</span>
        </div>
      </div>

      {/* User Status */}
      <div style={styles.userProfile}>
        <div style={styles.avatar}>A</div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>Andean Operator</span>
          <span style={styles.userRole}>Granja Canaviri</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={styles.nav}>
        <button
          onClick={() => onViewChange('dashboard')}
          style={{
            ...styles.navLink,
            ...(activeView === 'dashboard' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          Dashboard de Control
        </button>

        <button
          onClick={() => onViewChange('lots')}
          style={{
            ...styles.navLink,
            ...(activeView === 'lots' || activeView === 'lot-detail' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Gestión de Lotes
        </button>

        <button
          onClick={() => onViewChange('processing')}
          style={{
            ...styles.navLink,
            ...(activeView === 'processing' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          Procesamiento y Empaque
        </button>

        <button
          onClick={() => onViewChange('staff')}
          style={{
            ...styles.navLink,
            ...(activeView === 'staff' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Control de Personal
        </button>

        <button
          onClick={() => onViewChange('machinery')}
          style={{
            ...styles.navLink,
            ...(activeView === 'machinery' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Control de Maquinaria
        </button>

        <button
          onClick={() => onViewChange('irrigation')}
          style={{
            ...styles.navLink,
            ...(activeView === 'irrigation' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
          </svg>
          Riego y Clima (IoT)
        </button>

        <button
          onClick={() => onViewChange('warehouse')}
          style={{
            ...styles.navLink,
            ...(activeView === 'warehouse' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
          Control de Bodegas
        </button>

        <button
          onClick={() => onViewChange('sales')}
          style={{
            ...styles.navLink,
            ...(activeView === 'sales' ? styles.navLinkActive : {})
          }}
        >
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          Portal de Ventas
        </button>
      </nav>

      {/* Logout Action */}
      <div style={styles.footer}>
        <button onClick={onLogout} style={styles.logoutButton}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    borderRight: '1px solid var(--outline)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    padding: '0 8px',
  },
  logoContainer: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '24px',
    height: '24px',
  },
  brandName: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: '18px',
    margin: 0,
    letterSpacing: '0.05em',
  },
  brandSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: '24px',
    border: '1px solid var(--outline)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-light)',
    fontWeight: 600,
  },
  icon: {
    width: '20px',
    height: '20px',
  },
  footer: {
    borderTop: '1px solid var(--outline)',
    paddingTop: '16px',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--error)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
  },
};
