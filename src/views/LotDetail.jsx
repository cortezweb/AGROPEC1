import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

const STAGES = ['Siembra', 'Crecimiento', 'Cosecha', 'Procesamiento', 'Empacado'];

export default function LotDetail({ lotId, onBack }) {
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sensores'); // sensores / mapa / historial

  useEffect(() => {
    const lotRef = ref(db, `lots/${lotId}`);
    const unsubscribe = onValue(lotRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLot(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lotId]);

  const updateStatus = (newStatus) => {
    const lotRef = ref(db, `lots/${lotId}`);
    update(lotRef, {
      status: newStatus,
      currentHumidity: newStatus === 'Cosecha' ? lot.targetHumidity - 5 : lot.targetHumidity
    }).catch(err => {
      console.error("Error updating status:", err);
      alert("Error al actualizar el estado en Firebase.");
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Siembra': return 'badge-siembra';
      case 'Crecimiento': return 'badge-crecimiento';
      case 'Cosecha': return 'badge-cosecha';
      case 'Procesamiento': return 'badge-procesamiento';
      case 'Empacado': return 'badge-empacado';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <span>Cargando detalles de lote...</span>
      </div>
    );
  }

  if (!lot) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h3>Lote no encontrado</h3>
        <button onClick={onBack} className="btn btn-primary">Volver</button>
      </div>
    );
  }

  const currentStageIndex = STAGES.indexOf(lot.status);
  const humidityPercentage = Math.min(Math.round((lot.currentHumidity / lot.targetHumidity) * 100), 100);

  // Generate dynamic product history logs based on plantingDate and current stage
  const getProductiveHistory = () => {
    const history = [];
    const pDate = new Date(lot.plantingDate || '2026-02-15');

    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().substring(0, 10);
    };

    history.push({
      date: lot.plantingDate || '2026-02-15',
      activity: 'Preparación del Suelo',
      desc: `Acondicionamiento del terreno en la comunidad ${lot.community || 'Phuscani'}. Incorporación de abono orgánico en suelo tipo ${lot.soilType || 'Franco'}.`
    });

    history.push({
      date: addDays(pDate, 1),
      activity: 'Siembra Autorizada',
      desc: `Siembra de Cañihua variedad ${lot.variety || 'Cupilapaca'} a una altitud de ${lot.altitude || '3820'} msnm. Responsable del ciclo: ${lot.producer || 'Hamilton Canaviri'}.`
    });

    if (currentStageIndex >= 1) { // Crecimiento
      history.push({
        date: addDays(pDate, 15),
        activity: 'Germinación y Emergencia',
        desc: 'Emergencia foliar uniforme de las plantas de Cañihua. Control fenológico inicial exitoso.'
      });
      history.push({
        date: addDays(pDate, 35),
        activity: 'Riego Localizado',
        desc: `Aplicación de riego controlado para mantener humedad de suelo cercana al objetivo del ${lot.targetHumidity || '65'}%.`
      });
    }

    if (currentStageIndex >= 2) { // Cosecha
      history.push({
        date: addDays(pDate, 90),
        activity: 'Corte y Trilla (Cosecha)',
        desc: 'Recolección mecánica de los granos maduros. Rendimiento estimado óptimo. Calidad del grano: Grado A.'
      });
    }

    if (currentStageIndex >= 3) { // Procesamiento
      history.push({
        date: addDays(pDate, 95),
        activity: 'Aventamiento y Clasificación',
        desc: 'Limpieza de impurezas y clasificación del grano por tamaño en las cribas de planta.'
      });
    }

    if (currentStageIndex >= 4) { // Empacado
      history.push({
        date: addDays(pDate, 100),
        activity: 'Envasado y Sellado',
        desc: 'Granos de Cañihua envasados al vacío en sacos sellados de polipropileno listos para ventas B2B.'
      });
    }

    return history.reverse();
  };

  const historyLogs = getProductiveHistory();

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a Lotes
        </button>
        <div style={styles.actions}>
          <span className={`badge ${getStatusClass(lot.status)}`} style={{ fontSize: '14px', padding: '6px 16px' }}>
            Estado: {lot.status}
          </span>
        </div>
      </div>

      <div style={styles.titleSection}>
        <h1 style={styles.title}>{lot.name}</h1>
        <p style={styles.subtitle}>Ficha técnica agronómica extendida y monitoreo satelital en tiempo real</p>
      </div>

      <div style={styles.contentGrid}>
        {/* Left Side: Technical Info & Tabs (Sensors/Map/History) */}
        <div style={styles.leftCol}>
          
          {/* Ficha Técnica Card */}
          <div className="card" style={styles.cardInfo}>
            <h3 style={styles.sectionTitle}>Ficha Técnica Agronómica</h3>
            <div style={styles.detailsList}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Código Lote</span>
                <span style={styles.detailValue}>{lot.code || 'LOT-N/A'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Productor Responsable</span>
                <span style={styles.detailValue}>{lot.producer || 'Hamilton Canaviri'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Comunidad de Origen</span>
                <span style={styles.detailValue}>{lot.community || 'Comunidad General'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Superficie (Área)</span>
                <span style={styles.detailValue}>{lot.area} Hectáreas</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Variedad de Cañihua</span>
                <span style={styles.detailValue}>{lot.variety}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Altitud Promedio</span>
                <span style={styles.detailValue}>{lot.altitude || '3820'} msnm</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Tipo de Suelo</span>
                <span style={styles.detailValue}>{lot.soilType || 'Franco'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Coordenadas GPS</span>
                <span style={{ ...styles.detailValue, color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {lot.gps || '-16.1428, -69.2154'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs for Left Column Bottom */}
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('sensores')}
              style={{ ...styles.tabBtn, ...(activeTab === 'sensores' ? styles.tabBtnActive : {}) }}
            >
              Sensores IoT
            </button>
            <button
              onClick={() => setActiveTab('mapa')}
              style={{ ...styles.tabBtn, ...(activeTab === 'mapa' ? styles.tabBtnActive : {}) }}
            >
              Mapa de Ubicación
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              style={{ ...styles.tabBtn, ...(activeTab === 'historial' ? styles.tabBtnActive : {}) }}
            >
              Historial Productivo
            </button>
          </div>

          {/* TAB 1: SENSORES IoT */}
          {activeTab === 'sensores' && (
            <div className="card" style={styles.cardInfo}>
              <h3 style={styles.sectionTitle}>Telemetría de Suelo (Humedad / Temperatura)</h3>
              <div style={styles.sensorsGrid}>
                <div style={styles.sensorItem}>
                  <div style={styles.sensorLabel}>Humedad Actual</div>
                  <div style={styles.sensorVal}>{lot.currentHumidity?.toFixed(1)}%</div>
                  <div style={styles.sensorTarget}>Objetivo: {lot.targetHumidity}%</div>
                </div>
                <div style={styles.sensorItem}>
                  <div style={styles.sensorLabel}>Temperatura Suelo</div>
                  <div style={styles.sensorVal}>{lot.currentTemp?.toFixed(1)}°C</div>
                  <div style={styles.sensorTarget}>Objetivo: {lot.targetTemp}°C</div>
                </div>
              </div>
              <div style={{ ...styles.progressSection, marginTop: '24px' }}>
                <div style={styles.progressLabels}>
                  <span>Ratio de Humedad Óptima</span>
                  <span style={{ fontWeight: 600 }}>{humidityPercentage}%</span>
                </div>
                <div style={styles.progressTrack}>
                  <div 
                    style={{ 
                      ...styles.progressFill, 
                      width: `${humidityPercentage}%`,
                      backgroundColor: lot.currentHumidity >= lot.targetHumidity ? 'var(--tertiary)' : 'var(--primary)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MAPA DE UBICACIÓN */}
          {activeTab === 'mapa' && (
            <div className="card" style={styles.cardInfo}>
              <h3 style={styles.sectionTitle}>Visualizador de Ubicación GPS</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Ubicación del terreno en la comunidad <strong>{lot.community || 'Phuscani'}</strong>. Coordenadas: <code>{lot.gps || '-16.1428, -69.2154'}</code>.
              </p>
              <div style={styles.mapContainer}>
                <svg viewBox="0 0 400 200" style={styles.mapSvg}>
                  {/* Topographic contours */}
                  <path d="M10,120 C100,60 200,140 390,120" fill="none" stroke="#e0dbd5" strokeWidth="2" />
                  <path d="M10,150 C100,90 200,170 390,150" fill="none" stroke="#e0dbd5" strokeWidth="2" />
                  <path d="M10,90 C100,30 200,110 390,90" fill="none" stroke="#e0dbd5" strokeWidth="1" />

                  {/* Neighbor fields */}
                  <polygon points="20,20 120,10 100,70 10,60" fill="rgba(108, 47, 0, 0.03)" stroke="#d5c8be" strokeWidth="1" />
                  <text x="55" y="45" textAnchor="middle" style={styles.mapLabel}>Lote Vecino B-12</text>

                  <polygon points="260,20 380,30 350,110 230,100" fill="rgba(50, 69, 54, 0.03)" stroke="#c3cfc5" strokeWidth="1" />
                  <text x="300" y="65" textAnchor="middle" style={styles.mapLabel}>Comunidad Phuscani</text>

                  {/* Current Active Lot Bounds */}
                  <polygon points="120,40 240,30 210,140 90,120" fill="rgba(108, 47, 0, 0.08)" stroke="var(--primary)" strokeWidth="2" />
                  <text x="165" y="90" textAnchor="middle" style={{ fontSize: '11px', fill: 'var(--primary)', fontWeight: 700 }}>
                    {lot.name}
                  </text>

                  {/* GPS Pin Mark */}
                  <g>
                    <circle cx="165" cy="75" r="5" fill="var(--error)" />
                    <circle cx="165" cy="75" r="15" fill="none" stroke="var(--error)" strokeWidth="1.5">
                      <animate attributeName="r" values="5;20;5" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0;1" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="165" cy="75" r="2" fill="#ffffff" />
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* TAB 3: HISTORIAL PRODUCTIVO */}
          {activeTab === 'historial' && (
            <div className="card" style={styles.cardInfo}>
              <h3 style={styles.sectionTitle}>Bitácora del Ciclo Productivo</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Historial cronológico de tareas ejecutadas en el lote</p>
              
              <div style={styles.historyList}>
                {historyLogs.map((log, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <div style={styles.historyHeader}>
                      <span style={styles.historyActivity}>{log.activity}</span>
                      <span style={styles.historyDate}>{log.date}</span>
                    </div>
                    <p style={styles.historyDesc}>{log.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Timeline & Quick Actions */}
        <div style={styles.rightCol}>
          
          {/* Quick Actions (Modify status) */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={styles.sectionTitle}>Transición de Estado</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Cambiar la etapa actual del ciclo fenológico del cultivo:
            </p>
            <div style={styles.buttonsList}>
              {STAGES.map((stage, idx) => (
                <button
                  key={stage}
                  disabled={lot.status === stage}
                  onClick={() => updateStatus(stage)}
                  className={`btn ${lot.status === stage ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '10px 16px' }}
                >
                  <span style={styles.btnNumber}>{idx + 1}</span>
                  {lot.status === stage ? `Etapa Actual: ${stage}` : `Cambiar a ${stage}`}
                </button>
              ))}
            </div>
          </div>

          {/* Crop Timeline */}
          <div className="card">
            <h3 style={styles.sectionTitle}>Línea de Tiempo del Cultivo</h3>
            <p style={{ ...styles.cardSubtitle, marginBottom: '24px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Fases operativas de la Cañihua
            </p>
            
            <div className="timeline">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isActive = idx === currentStageIndex;
                
                return (
                  <div key={stage} className={`timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="timeline-title" style={{ color: isActive ? 'var(--primary)' : 'var(--text-primary)', fontWeight: isActive ? 700 : 500 }}>
                          {stage}
                        </span>
                        {isActive && <span style={styles.activeTag}>FASE ACTIVA</span>}
                      </div>
                      <p style={styles.timelineDesc}>
                        {stage === 'Siembra' && 'Fase de preparación del suelo andino y siembra de semillas.'}
                        {stage === 'Crecimiento' && 'Monitoreo de riego automático, control de humedad y temperatura.'}
                        {stage === 'Cosecha' && 'Recolección del grano maduro de Cañihua en condiciones secas.'}
                        {stage === 'Procesamiento' && 'Limpieza, clasificación y aventamiento en el centro de procesamiento.'}
                        {stage === 'Empacado' && 'Empaque al vacío y pesaje en sacos sellados listos para distribución.'}
                      </p>
                      {isCompleted && <span style={styles.completedTag}>COMPLETADO ✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 0',
  },
  titleSection: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-muted)',
  },
  contentGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: 1.3,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    minWidth: '320px',
  },
  rightCol: {
    flex: 1,
    minWidth: '320px',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    marginBottom: '16px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '12px',
  },
  sensorsGrid: {
    display: 'flex',
    gap: '16px',
  },
  sensorItem: {
    flex: 1,
    padding: '20px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  sensorLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  sensorVal: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--primary)',
    marginBottom: '4px',
  },
  sensorTarget: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--outline)',
    fontSize: '14px',
  },
  detailLabel: {
    color: 'var(--text-muted)',
  },
  detailValue: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  buttonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  btnNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(108, 47, 0, 0.1)',
    color: 'var(--primary)',
    fontSize: '11px',
    fontWeight: 700,
    marginRight: '8px',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  progressTrack: {
    height: '6px',
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    border: '1px solid var(--outline)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.5s ease-out',
  },
  timelineDesc: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: '6px 0',
  },
  activeTag: {
    fontSize: '10px',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
  },
  completedTag: {
    fontSize: '11px',
    color: 'var(--tertiary)',
    fontWeight: 600,
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
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '2px',
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
  },
  mapContainer: {
    width: '100%',
  },
  mapSvg: {
    width: '100%',
    height: 'auto',
    backgroundColor: '#f6f5f4',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
  },
  mapLabel: {
    fontSize: '8px',
    fill: 'var(--text-muted)',
    fontWeight: 500,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  historyItem: {
    padding: '16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  historyActivity: {
    fontWeight: 700,
    fontSize: '13.5px',
    color: 'var(--primary)',
  },
  historyDate: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  historyDesc: {
    fontSize: '12.5px',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
  }
};
