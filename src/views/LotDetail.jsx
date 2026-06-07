import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

const STAGES = ['Siembra', 'Crecimiento', 'Cosecha', 'Procesamiento', 'Empacado'];

export default function LotDetail({ lotId, onBack }) {
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);

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
      // Adjust humidity/temp dynamically on status change for realism
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
        <p style={styles.subtitle}>Detalle técnico, calidad y trazabilidad de Cañihua variedad <strong>{lot.variety}</strong></p>
      </div>

      <div style={styles.contentGrid}>
        {/* Left Side: Technical Info & Sensor Cards */}
        <div style={styles.leftCol}>
          {/* Sensors Card */}
          <div className="card" style={styles.cardInfo}>
            <h3 style={styles.sectionTitle}>Sensores de Suelo</h3>
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

          {/* Crop parameters */}
          <div className="card" style={styles.cardInfo}>
            <h3 style={styles.sectionTitle}>Ficha Técnica</h3>
            <div style={styles.detailsList}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Variedad Cultivada</span>
                <span style={styles.detailValue}>{lot.variety}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Área Total</span>
                <span style={styles.detailValue}>{lot.area} Hectáreas</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Fecha de Siembra</span>
                <span style={styles.detailValue}>{lot.plantingDate}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Grado de Calidad</span>
                <span style={{ ...styles.detailValue, color: 'var(--tertiary)', fontWeight: 700 }}>GRADO A</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Modify status) */}
          <div className="card" style={styles.cardInfo}>
            <h3 style={styles.sectionTitle}>Acciones Rápidas</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Actualiza el estado de tu lote en la base de datos de Firebase</p>
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
                  {lot.status === stage ? `Actual: ${stage}` : `Pasar a ${stage}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & Logs */}
        <div style={styles.rightCol}>
          <div className="card" style={{ height: '100%' }}>
            <h3 style={styles.sectionTitle}>Línea de Tiempo del Cultivo</h3>
            <p style={{ ...styles.cardSubtitle, marginBottom: '32px' }}>Fases operativas del lote de Cañihua</p>
            
            <div className="timeline">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isActive = idx === currentStageIndex;
                
                return (
                  <div key={stage} className={`timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="timeline-title" style={{ color: isActive ? 'var(--primary)' : 'var(--text-primary)' }}>
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
    flex: 1.2,
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
};
