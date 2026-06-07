import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard({ onViewChange, onLotSelect }) {
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const lotsRef = ref(db, 'lots');
    const unsubscribe = onValue(lotsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data);
      } else {
        setLots({});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Dashboard):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const lotList = Object.values(lots);

  // Aggregated Metrics
  const totalLots = lotList.length;
  const totalArea = lotList.reduce((sum, lot) => sum + (lot.area || 0), 0);
  const avgHumidity = totalLots > 0 
    ? (lotList.reduce((sum, lot) => sum + (lot.currentHumidity || 0), 0) / totalLots) 
    : 0;
  const avgTemp = totalLots > 0 
    ? (lotList.reduce((sum, lot) => sum + (lot.currentTemp || 0), 0) / totalLots) 
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard de Control de Producción</h1>
          <p style={styles.subtitle}>Granja Agrícola Canaviri — Resumen Operativo</p>
        </div>
        <div style={styles.dateBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
          <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Por favor, verifica:
            <br />1. Que las reglas de tu Realtime Database permitan lectura/escritura pública (ej. <code>{`{ ".read": true, ".write": true }`}</code>).
            <br />2. Que la URL de la base de datos en el archivo <code>.env</code> sea la correcta de tu proyecto.
          </p>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Sincronizando datos con Firebase...</span>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="metrics-grid">
            {/* Metric 1 */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Lotes de Cañihua</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{totalLots}</div>
              <div className="metric-footer">
                <span>Registrados en el sistema</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Área Total Cultivada</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--secondary-container)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2">
                    <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{totalArea.toFixed(1)} <span style={{ fontSize: '18px' }}>ha</span></div>
              <div className="metric-footer">
                <span>Hectáreas productivas</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Humedad Promedio</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{avgHumidity.toFixed(1)}%</div>
              <div className="metric-footer">
                <span>Humedad óptima del suelo</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Temperatura Promedio</span>
                <div style={{ ...styles.iconBox, backgroundColor: '#ffe088' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#735c00" strokeWidth="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{avgTemp.toFixed(1)}°C</div>
              <div className="metric-footer">
                <span>Temperatura media de suelo</span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Section */}
          <div style={styles.mainDashboardSection}>
            {/* Chart Card */}
            <div className="card" style={{ flex: 1.5 }}>
              <h3 style={styles.cardTitle}>Histórico de Humedad de Cultivos</h3>
              <p style={styles.cardSubtitle}>Tendencia de humedad en suelo durante la última semana (%)</p>
              
              <div className="chart-container">
                <svg viewBox="0 0 500 200" style={styles.svgChart}>
                  {/* Grid Lines */}
                  <line x1="40" y1="30" x2="480" y2="30" stroke="#f0eded" strokeWidth="1" />
                  <line x1="40" y1="80" x2="480" y2="80" stroke="#f0eded" strokeWidth="1" />
                  <line x1="40" y1="130" x2="480" y2="130" stroke="#f0eded" strokeWidth="1" />
                  <line x1="40" y1="180" x2="480" y2="180" stroke="#e4e2e1" strokeWidth="1.5" />
                  
                  {/* Y Axis labels */}
                  <text x="15" y="35" style={styles.chartText}>80%</text>
                  <text x="15" y="85" style={styles.chartText}>60%</text>
                  <text x="15" y="135" style={styles.chartText}>40%</text>
                  <text x="15" y="185" style={styles.chartText}>20%</text>

                  {/* Area Under Curve */}
                  <path 
                    d="M 40 180 Q 110 80 180 110 T 320 60 T 480 90 L 480 180 Z" 
                    fill="rgba(50, 69, 54, 0.08)"
                  />
                  
                  {/* Trend Line (Sage Green) */}
                  <path 
                    d="M 40 180 Q 110 80 180 110 T 320 60 T 480 90" 
                    fill="none" 
                    stroke="var(--tertiary)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  
                  {/* Points (Terracotta) */}
                  <circle cx="110" cy="95" r="5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="210" cy="100" r="5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="320" cy="60" r="5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="425" cy="80" r="5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  
                  {/* Tooltip labels */}
                  <text x="320" y="45" style={{ ...styles.chartText, fontWeight: 700, fill: 'var(--primary)', textAnchor: 'middle' }}>68% (Hoy)</text>
                  
                  {/* X Axis labels */}
                  <text x="40" y="198" style={styles.chartText}>Lun</text>
                  <text x="110" y="198" style={styles.chartText}>Mar</text>
                  <text x="180" y="198" style={styles.chartText}>Mié</text>
                  <text x="250" y="198" style={styles.chartText}>Jue</text>
                  <text x="320" y="198" style={styles.chartText}>Vie</text>
                  <text x="390" y="198" style={styles.chartText}>Sáb</text>
                  <text x="460" y="198" style={styles.chartText}>Dom</text>
                </svg>
              </div>
            </div>

            {/* Notifications Panel */}
            <div className="card" style={{ flex: 1 }}>
              <h3 style={styles.cardTitle}>Alertas & Actividades</h3>
              <p style={styles.cardSubtitle}>Logs de sensores en tiempo real</p>
              
              <div style={styles.alertList}>
                <div style={styles.alertItem}>
                  <div style={{ ...styles.alertDot, backgroundColor: 'var(--primary)' }}></div>
                  <div style={styles.alertContent}>
                    <span style={styles.alertTitle}>Riego Automático Activado</span>
                    <span style={styles.alertTime}>Lote C-01 • Hace 10 min</span>
                  </div>
                </div>

                <div style={styles.alertItem}>
                  <div style={{ ...styles.alertDot, backgroundColor: 'var(--secondary)' }}></div>
                  <div style={styles.alertContent}>
                    <span style={styles.alertTitle}>Humedad en suelo bajo el objetivo</span>
                    <span style={styles.alertTime}>Lote C-03 • Hace 2 horas</span>
                  </div>
                </div>

                <div style={styles.alertItem}>
                  <div style={{ ...styles.alertDot, backgroundColor: 'var(--tertiary)' }}></div>
                  <div style={styles.alertContent}>
                    <span style={styles.alertTitle}>Control de calidad: Grado A alcanzado</span>
                    <span style={styles.alertTime}>Lote C-02 • Hace 1 día</span>
                  </div>
                </div>

                <div style={styles.alertItem}>
                  <div style={{ ...styles.alertDot, backgroundColor: 'var(--text-muted)' }}></div>
                  <div style={styles.alertContent}>
                    <span style={styles.alertTitle}>Lote C-03 registrado en el sistema</span>
                    <span style={styles.alertTime}>Granja Canaviri • Hace 3 días</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Lot List */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div style={styles.quickAccessHeader}>
              <h3 style={styles.cardTitle}>Monitoreo Rápido de Lotes</h3>
              <button onClick={() => onViewChange('lots')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                Ver Todos los Lotes
              </button>
            </div>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableRowHead}>
                    <th style={styles.th}>Identificador</th>
                    <th style={styles.th}>Variedad</th>
                    <th style={styles.th}>Área</th>
                    <th style={styles.th}>Humedad Actual</th>
                    <th style={styles.th}>Temperatura</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lotList.slice(0, 4).map(lot => (
                    <tr key={lot.id} style={styles.tableRowBody}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{lot.name}</td>
                      <td style={styles.td}>{lot.variety}</td>
                      <td style={styles.td}>{lot.area} ha</td>
                      <td style={styles.td}>
                        <div style={styles.tableCellProgress}>
                          <span style={{ minWidth: '45px' }}>{lot.currentHumidity?.toFixed(1)}%</span>
                          <div style={styles.miniProgressTrack}>
                            <div 
                              style={{ 
                                ...styles.miniProgressFill, 
                                width: `${Math.min(Math.round((lot.currentHumidity / lot.targetHumidity) * 100), 100)}%`,
                                backgroundColor: lot.currentHumidity >= lot.targetHumidity ? 'var(--tertiary)' : 'var(--primary)'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{lot.currentTemp?.toFixed(1)}°C</td>
                      <td style={styles.td}>
                        <span className={`badge ${
                          lot.status === 'Siembra' ? 'badge-siembra' :
                          lot.status === 'Crecimiento' ? 'badge-crecimiento' :
                          lot.status === 'Cosecha' ? 'badge-cosecha' :
                          lot.status === 'Procesamiento' ? 'badge-procesamiento' :
                          'badge-empacado'
                        }`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {lot.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => onLotSelect(lot.id)} className="btn btn-tertiary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                          Inspeccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  dateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainDashboardSection: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    marginBottom: '4px',
  },
  cardSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  svgChart: {
    width: '100%',
    height: '100%',
  },
  chartText: {
    fontSize: '10px',
    fill: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--outline)',
  },
  alertDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '6px',
    flexShrink: 0,
  },
  alertContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  alertTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  alertTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  quickAccessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableRowHead: {
    borderBottom: '2px solid var(--outline)',
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  tableRowBody: {
    borderBottom: '1px solid var(--outline)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '13px',
  },
  tableCellProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  miniProgressTrack: {
    height: '4px',
    width: '80px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    border: '1px solid var(--outline)',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '64px 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--outline)',
    borderTopColor: 'var(--primary)',
    borderRadius: 'var(--radius-full)',
    animation: 'spin 1s linear infinite',
  },
  errorBanner: {
    backgroundColor: 'var(--error-container)',
    border: '1px solid var(--error)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
  },
};
