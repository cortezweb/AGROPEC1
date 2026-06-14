import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard({ onViewChange, onLotSelect }) {
  const [lots, setLots] = useState({});
  const [cropCycles, setCropCycles] = useState({});
  const [cropFertilizations, setCropFertilizations] = useState({});
  const [cropPests, setCropPests] = useState({});
  const [staffLogs, setStaffLogs] = useState({});
  const [landPreparation, setLandPreparation] = useState({});
  const [irrigationLogs, setIrrigationLogs] = useState({});
  const [salesOrders, setSalesOrders] = useState({});
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setCropCycles(data.crop_cycles || {});
        setCropFertilizations(data.crop_fertilizations || {});
        setCropPests(data.crop_pests || {});
        setStaffLogs(data.staff_logs || {});
        setLandPreparation(data.land_preparation || {});
        setIrrigationLogs(data.irrigation_logs || {});
        setSalesOrders(data.orders || {});
        setInvoices(data.warehouse_invoices || data.machine_invoices || {});
      } else {
        setLots({});
        setCropCycles({});
        setCropFertilizations({});
        setCropPests({});
        setStaffLogs({});
        setLandPreparation({});
        setIrrigationLogs({});
        setSalesOrders({});
        setInvoices({});
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
  const cycleList = Object.values(cropCycles);
  const harvestedCycles = cycleList.filter(c => c.status === 'Cosechado');
  const pestList = Object.values(cropPests);
  const prepList = Object.values(landPreparation);
  const fertList = Object.values(cropFertilizations);
  const slogList = Object.values(staffLogs);
  const salesList = Object.values(salesOrders);
  const irrList = Object.values(irrigationLogs);
  const invList = Object.values(invoices);

  // 1. Total Production
  const totalProduction = harvestedCycles.reduce((sum, c) => sum + (Number(c.production) || 0), 0);

  // 2. Yield (Rendimiento Medio)
  const totalHarvestedArea = harvestedCycles.reduce((sum, c) => sum + (lots[c.lotId]?.area || 0), 0);
  const avgYield = totalHarvestedArea > 0 ? (totalProduction / totalHarvestedArea) : 0;

  // 3. Total Costs (Egresos)
  const costPreparation = prepList.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const costFertilization = fertList.reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
  const costLabor = slogList.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);
  const costIndirect = invList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalCosts = costPreparation + costFertilization + costLabor + costIndirect;

  // 4. Net Utility (Ingresos - Egresos)
  const totalRevenues = salesList
    .filter(o => o.status === 'Entregado' || o.status === 'En tránsito')
    .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  const netUtility = totalRevenues - totalCosts;
  const marginPercentage = totalRevenues > 0 ? (netUtility / totalRevenues) * 100 : 0;

  // 5. Water Consumption
  const waterConsumed = irrList.reduce((sum, l) => sum + (Number(l.waterConsumed) || 0), 0);

  // 6. Active Pest Alerts
  const activeAlertsCount = pestList.filter(p => p.alert === 'Activa').length;

  return (
    <div>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Dashboard de Control de Producción</h1>
          <p style={styles.subtitle} className="view-subtitle">Granja Agrícola Canaviri — Resumen Operativo</p>
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
            {/* Metric 1: Producción Total */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Producción Total</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{totalProduction.toFixed(1)} <span style={{ fontSize: '18px' }}>t</span></div>
              <div className="metric-footer">
                <span>Volumen total cosechado</span>
              </div>
            </div>

            {/* Metric 2: Rendimiento Medio */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Rendimiento Medio</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--secondary-container)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2">
                    <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
                  </svg>
                </div>
              </div>
              <div className="metric-value">{avgYield.toFixed(2)} <span style={{ fontSize: '18px' }}>t/ha</span></div>
              <div className="metric-footer">
                <span>Eficiencia promedio de parcelas</span>
              </div>
            </div>

            {/* Metric 3: Costos Generales */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Costos Generales</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--error-container)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--error)' }}>
                ${totalCosts.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="metric-footer">
                <span>Egresos totales acumulados</span>
              </div>
            </div>

            {/* Metric 4: Utilidad Neta */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Utilidad Neta</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
              </div>
              <div className="metric-value" style={{ color: netUtility >= 0 ? 'var(--tertiary)' : 'var(--error)' }}>
                ${netUtility.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="metric-footer">
                <span>Margen neto: {marginPercentage.toFixed(1)}%</span>
              </div>
            </div>

            {/* Metric 5: Agua Consumida */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Consumo de Agua</span>
                <div style={{ ...styles.iconBox, backgroundColor: '#e6f7ff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="2">
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                  </svg>
                </div>
              </div>
              <div className="metric-value" style={{ color: '#1890ff' }}>
                {waterConsumed.toLocaleString('es-ES')} <span style={{ fontSize: '18px' }}>L</span>
              </div>
              <div className="metric-footer">
                <span>Total de agua en riego</span>
              </div>
            </div>

            {/* Metric 6: Alertas MIP Activas */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Alertas MIP</span>
                <div style={{ 
                  ...styles.iconBox, 
                  backgroundColor: activeAlertsCount > 0 ? 'var(--error-container)' : 'var(--primary-light)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                    stroke={activeAlertsCount > 0 ? 'var(--error)' : 'var(--primary)'} strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>
              <div className="metric-value" style={{ color: activeAlertsCount > 0 ? 'var(--error)' : 'var(--text-primary)' }}>
                {activeAlertsCount}
              </div>
              <div className="metric-footer">
                <span>Alertas activas de plagas</span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Section */}
          <div style={styles.mainDashboardSection} className="view-main-dashboard-section">
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
              <p style={styles.cardSubtitle}>Monitoreo en vivo de plagas y riego</p>
              
              <div style={styles.alertList}>
                {pestList.filter(p => p.alert === 'Activa').map(p => (
                  <div key={p.id} style={styles.alertItem}>
                    <div style={{ ...styles.alertDot, backgroundColor: 'var(--error)' }}></div>
                    <div style={styles.alertContent}>
                      <span style={{ ...styles.alertTitle, color: 'var(--error)' }}>⚠️ Plaga Activa: {p.name}</span>
                      <span style={styles.alertTime}>{p.lotName} • Método: {p.treatment || 'En evaluación'}</span>
                    </div>
                  </div>
                ))}

                {irrList.slice(0, 3).map(l => (
                  <div key={l.id} style={styles.alertItem}>
                    <div style={{ ...styles.alertDot, backgroundColor: '#1890ff' }}></div>
                    <div style={styles.alertContent}>
                      <span style={styles.alertTitle}>Riego {l.type} finalizado ({l.waterConsumed} L)</span>
                      <span style={styles.alertTime}>{l.sector} • {l.date}</span>
                    </div>
                  </div>
                ))}

                {pestList.filter(p => p.alert === 'Activa').length === 0 && irrList.length === 0 && (
                  <div style={styles.alertItem}>
                    <div style={{ ...styles.alertDot, backgroundColor: 'var(--text-muted)' }}></div>
                    <div style={styles.alertContent}>
                      <span style={styles.alertTitle}>No hay eventos recientes</span>
                      <span style={styles.alertTime}>Granja Canaviri</span>
                    </div>
                  </div>
                )}
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
            
            <div style={styles.tableContainer} className="view-table-container">
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
                                width: `${Math.min(Math.round(((lot.currentHumidity || 0) / (lot.targetHumidity || 60)) * 100), 100)}%`,
                                backgroundColor: (lot.currentHumidity || 0) >= (lot.targetHumidity || 60) ? 'var(--tertiary)' : 'var(--primary)'
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
