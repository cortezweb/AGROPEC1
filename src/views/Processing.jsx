import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

export default function Processing() {
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Machinery state (mock, but could be connected to Firebase as well)
  const machines = [
    { id: 'mac-1', name: 'Limpiadora de Granos', status: 'Operando', speed: '1200 rpm', temp: '22°C', load: '85%' },
    { id: 'mac-2', name: 'Secadora Rotativa', status: 'Operando', speed: '45 rpm', temp: '48°C', load: '60%' },
    { id: 'mac-3', name: 'Clasificadora por Gravedad', status: 'Standby', speed: '0 rpm', temp: '18°C', load: '0%' },
    { id: 'mac-4', name: 'Envasadora Automatizada', status: 'Operando', speed: '15 sacos/min', temp: '25°C', load: '90%' },
  ];

  useEffect(() => {
    const lotsRef = ref(db, 'lots');
    const unsubscribe = onValue(lotsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Processing):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdvanceStatus = (lotId, currentStatus) => {
    const lotRef = ref(db, `lots/${lotId}`);
    let nextStatus = '';
    
    if (currentStatus === 'Procesamiento') {
      nextStatus = 'Empacado';
    } else if (currentStatus === 'Empacado') {
      nextStatus = 'Finalizado';
    }

    if (nextStatus) {
      update(lotRef, { status: nextStatus }).catch(err => {
        console.error("Error updating status:", err);
        alert("Error al actualizar el estado del lote en Firebase.");
      });
    }
  };

  const processingLots = Object.values(lots).filter(
    lot => lot.status === 'Procesamiento' || lot.status === 'Empacado'
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Centro de Procesamiento y Empaque</h1>
          <p style={styles.subtitle} className="view-subtitle">Supervisa la limpieza, secado, selección y envasado del grano de Cañihua</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Machinery Status Grid */}
      <h3 style={styles.sectionTitle}>Estado de Maquinaria</h3>
      <div style={styles.machinesGrid}>
        {machines.map(mac => (
          <div key={mac.id} className="card" style={styles.machineCard}>
            <div style={styles.machineHeader}>
              <span style={styles.machineName}>{mac.name}</span>
              <span style={{
                ...styles.machineBadge,
                backgroundColor: mac.status === 'Operando' ? 'var(--tertiary-container)' : 'var(--outline)',
                color: mac.status === 'Operando' ? 'var(--tertiary)' : 'var(--text-muted)'
              }}>
                {mac.status}
              </span>
            </div>
            <div style={styles.machineDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Velocidad</span>
                <span style={styles.detailVal}>{mac.speed}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Temperatura</span>
                <span style={styles.detailVal}>{mac.temp}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Carga útil</span>
                <span style={styles.detailVal}>{mac.load}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lots in Processing Section */}
      <h3 style={styles.sectionTitle}>Lotes en Línea de Procesamiento</h3>
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Cargando lotes en proceso...</span>
        </div>
      ) : (
        <div className="card">
          {processingLots.length === 0 ? (
            <div style={styles.noData}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <h4>No hay lotes activos en procesamiento o empaque</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Ve a **Gestión de Lotes** e inspecciona un lote en estado de Cosecha para pasarlo a Procesamiento.
              </p>
            </div>
          ) : (
            <div style={styles.tableContainer} className="view-table-container">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableRowHead}>
                    <th style={styles.th}>Identificador</th>
                    <th style={styles.th}>Variedad</th>
                    <th style={styles.th}>Área</th>
                    <th style={styles.th}>Fase Actual</th>
                    <th style={styles.th}>Humedad</th>
                    <th style={styles.th}>Acciones de Línea</th>
                  </tr>
                </thead>
                <tbody>
                  {processingLots.map(lot => (
                    <tr key={lot.id} style={styles.tableRowBody}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{lot.name}</td>
                      <td style={styles.td}>{lot.variety}</td>
                      <td style={styles.td}>{lot.area} ha</td>
                      <td style={styles.td}>
                        <span className={`badge ${lot.status === 'Procesamiento' ? 'badge-procesamiento' : 'badge-empacado'}`}>
                          {lot.status}
                        </span>
                      </td>
                      <td style={styles.td}>{lot.currentHumidity?.toFixed(1)}%</td>
                      <td style={styles.td}>
                        {lot.status === 'Procesamiento' && (
                          <button
                            onClick={() => handleAdvanceStatus(lot.id, 'Procesamiento')}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Avanzar a Empacado
                          </button>
                        )}
                        {lot.status === 'Empacado' && (
                          <button
                            onClick={() => handleAdvanceStatus(lot.id, 'Empacado')}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Finalizar y Almacenar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
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
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    marginBottom: '16px',
    marginTop: '32px',
  },
  machinesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
  },
  machineCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  machineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '12px',
  },
  machineName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  machineBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'uppercase',
  },
  machineDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  detailLabel: {
    color: 'var(--text-muted)',
  },
  detailVal: {
    fontWeight: 600,
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
  },
  td: {
    padding: '16px',
    fontSize: '13px',
  },
  noData: {
    textAlign: 'center',
    padding: '48px 16px',
    color: 'var(--text-muted)',
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
