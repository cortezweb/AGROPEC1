import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';
import LotFormModal from '../components/LotFormModal';

const MOCK_LOTS = {
  'lot-1': {
    id: 'lot-1',
    code: 'LOT-C01',
    name: 'Lote Canaviri C-01',
    variety: 'Cupilapaca',
    area: 3.2,
    status: 'Cosecha',
    plantingDate: '2026-02-15',
    targetHumidity: 60,
    targetTemp: 12,
    currentHumidity: 58.4,
    currentTemp: 12.8,
    producer: 'Mateo Quispe',
    community: 'Comunidad Phuscani',
    gps: '-16.1428, -69.2154',
    altitude: 3820,
    soilType: 'Franco-Arenoso',
    createdAt: '2026-02-15T08:00:00.000Z'
  },
  'lot-2': {
    id: 'lot-2',
    code: 'LOT-C02',
    name: 'Lote Canaviri C-02',
    variety: 'Lasti',
    area: 1.8,
    status: 'Crecimiento',
    plantingDate: '2026-03-10',
    targetHumidity: 70,
    targetTemp: 14,
    currentHumidity: 68.2,
    currentTemp: 13.9,
    producer: 'Lucía Mamani',
    community: 'Comunidad Phuscani',
    gps: '-16.1512, -69.2084',
    altitude: 3815,
    soilType: 'Franco-Arcilloso',
    createdAt: '2026-03-10T09:30:00.000Z'
  },
  'lot-3': {
    id: 'lot-3',
    code: 'LOT-C03',
    name: 'Lote Canaviri C-03',
    variety: 'Saihua',
    area: 2.5,
    status: 'Siembra',
    plantingDate: '2026-05-20',
    targetHumidity: 65,
    targetTemp: 15,
    currentHumidity: 64.0,
    currentTemp: 15.2,
    producer: 'Juan Choque',
    community: 'Comunidad Phuscani',
    gps: '-16.1385, -69.2201',
    altitude: 3830,
    soilType: 'Franco',
    createdAt: '2026-05-20T10:15:00.000Z'
  }
};

export default function LotManagement({ onLotSelect }) {
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      console.error("Firebase Read Error (LotManagement):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddLot = (newLotData) => {
    const lotsRef = ref(db, 'lots');
    const newLotRef = push(lotsRef);
    const id = newLotRef.key;
    
    set(newLotRef, {
      id,
      ...newLotData
    }).then(() => {
      setIsModalOpen(false);
    }).catch(err => {
      console.error("Error al guardar lote:", err);
      alert("Error al guardar el lote en Firebase.");
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

  const filteredLots = Object.values(lots).filter(lot => {
    if (filterStatus === 'Todos') return true;
    return lot.status === filterStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Cosechas y Lotes</h1>
          <p style={styles.subtitle}>Supervisa y registra el estado de cultivo de Cañihua</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar Nuevo Lote
        </button>
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

      {/* Loading State */}
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span style={{ color: 'var(--text-muted)' }}>Cargando lotes desde Firebase...</span>
        </div>
      ) : (
        /* Lots Grid */
        <div className="lots-grid">
          {filteredLots.length === 0 ? (
            <div style={styles.noData}>
              <h3>No se encontraron lotes</h3>
              <p>No hay cultivos registrados en el estado "{filterStatus}".</p>
            </div>
          ) : (
            filteredLots.map(lot => {
              const humidityPercentage = Math.min(Math.round((lot.currentHumidity / lot.targetHumidity) * 100), 100);
              return (
                <div key={lot.id} className="card" style={styles.lotCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.lotVariety}>{lot.variety}</span>
                    <span className={`badge ${getStatusClass(lot.status)}`}>{lot.status}</span>
                  </div>

                  <h3 style={styles.lotName}>{lot.name}</h3>

                  <div style={styles.cardDetails}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>ÁREA</span>
                      <span style={styles.detailVal}>{lot.area} Hectáreas</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>FECHA SIEMBRA</span>
                      <span style={styles.detailVal}>{lot.plantingDate}</span>
                    </div>
                  </div>

                  {/* Humidity Progress Bar */}
                  <div style={styles.progressSection}>
                    <div style={styles.progressLabels}>
                      <span>Humedad Suelo</span>
                      <span style={{ fontWeight: 600 }}>{lot.currentHumidity?.toFixed(1)}% / {lot.targetHumidity}%</span>
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

                  {/* Footer Stats */}
                  <div style={styles.cardFooter}>
                    <div style={styles.tempBox}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary)' }}>
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                      </svg>
                      <span>{lot.currentTemp?.toFixed(1)}°C (Obj: {lot.targetTemp}°C)</span>
                    </div>
                    <button onClick={() => onLotSelect(lot.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Ver Detalles
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lot Creation Modal */}
      <LotFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddLot}
      />
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
  filtersContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '12px',
    overflowX: 'auto',
  },
  filterTab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  filterTabActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
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
  noData: {
    textAlign: 'center',
    padding: '48px 16px',
    color: 'var(--text-muted)',
    gridColumn: '1 / -1',
  },
  lotCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotVariety: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  lotName: {
    fontSize: '18px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
  },
  cardDetails: {
    display: 'flex',
    gap: '24px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  detailVal: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
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
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--outline)',
    paddingTop: '12px',
    marginTop: '4px',
  },
  tempBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  errorBanner: {
    backgroundColor: 'var(--error-container)',
    border: '1px solid var(--error)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
  },
};
// Add spin keyframe injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  document.getElementsByTagName('head')[0].appendChild(style);
}
