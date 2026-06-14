import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';

const TABS = [
  { id: 'historial', label: 'Historial de Labores' },
  { id: 'registrar', label: 'Registrar Labor' },
  { id: 'metricas', label: 'Métricas y Rendimiento' }
];

const LABOR_TYPES = ['Arado', 'Rastrado', 'Subsolado'];

export default function LandPreparation() {
  const [activeTab, setActiveTab] = useState('historial');
  const [preparations, setPreparations] = useState({});
  const [lots, setLots] = useState({});
  const [machines, setMachines] = useState({});
  const [staff, setStaff] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [selectedLotId, setSelectedLotId] = useState('');
  const [activityType, setActivityType] = useState('Arado');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [hours, setHours] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setMachines(data.machinery || {});
        setStaff(data.staff || {});
        setPreparations(data.land_preparation || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (LandPreparation):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default form selections once data is loaded
  useEffect(() => {
    const lotKeys = Object.keys(lots);
    const machineKeys = Object.keys(machines);
    const staffKeys = Object.keys(staff);

    if (lotKeys.length > 0 && !selectedLotId) setSelectedLotId(lotKeys[0]);
    if (machineKeys.length > 0 && !selectedMachineId) setSelectedMachineId(machineKeys[0]);
    if (staffKeys.length > 0 && !selectedOperatorId) setSelectedOperatorId(staffKeys[0]);
  }, [lots, machines, staff]);

  const prepList = Object.values(preparations).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculation metrics
  const totalHours = prepList.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
  const totalCost = prepList.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const avgCostPerHour = totalHours > 0 ? (totalCost / totalHours) : 0;

  // Count labor types
  const laborCounts = prepList.reduce((acc, p) => {
    acc[p.activityType] = (acc[p.activityType] || 0) + 1;
    return acc;
  }, {});

  let mostFrequentLabor = 'Ninguno';
  let maxCount = 0;
  Object.entries(laborCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentLabor = type;
    }
  });

  const handleSavePreparation = (e) => {
    e.preventDefault();
    if (!selectedLotId || !activityType || !date || !selectedMachineId || !selectedOperatorId || !hours || !cost) {
      alert("Por favor, rellene todos los campos obligatorios.");
      return;
    }

    if (Number(hours) <= 0 || Number(cost) <= 0) {
      alert("Las horas y el costo deben ser valores positivos.");
      return;
    }

    setSubmitting(true);

    const lotName = lots[selectedLotId]?.name || 'Lote Desconocido';
    const machineName = machines[selectedMachineId]?.name || 'Maquinaria Desconocida';
    const operatorName = staff[selectedOperatorId]?.name || 'Operador Desconocido';

    const prepRef = ref(db, 'land_preparation');
    const newPrepRef = push(prepRef);
    const id = newPrepRef.key;

    const newRecord = {
      id,
      lotId: selectedLotId,
      lotName,
      activityType,
      date,
      machineId: selectedMachineId,
      machineName,
      operatorId: selectedOperatorId,
      operatorName,
      hours: parseFloat(hours),
      cost: parseFloat(cost),
      createdAt: new Date().toISOString()
    };

    set(newPrepRef, newRecord)
      .then(() => {
        alert("¡Labor de preparación registrada exitosamente!");
        setHours('');
        setCost('');
        setSubmitting(false);
        setActiveTab('historial');
      })
      .catch((err) => {
        console.error("Firebase Write Error (LandPreparation):", err);
        alert("Error al guardar la labor en Firebase.");
        setSubmitting(false);
      });
  };

  // Metrics processing for charts
  const costByLaborType = LABOR_TYPES.reduce((acc, type) => {
    acc[type] = prepList
      .filter(p => p.activityType === type)
      .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    return acc;
  }, {});

  const maxLaborCost = Math.max(...Object.values(costByLaborType), 1);

  // Machine efficiency calculations
  const machineEfficiency = Object.keys(machines).reduce((acc, mId) => {
    const machinePreps = prepList.filter(p => p.machineId === mId);
    const mHours = machinePreps.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
    const mCost = machinePreps.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const mName = machines[mId]?.name || 'Maquinaria';
    
    if (mHours > 0) {
      acc.push({
        id: mId,
        name: mName,
        hours: mHours,
        cost: mCost,
        costPerHour: mCost / mHours
      });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando datos de preparación de terreno...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Preparación de Terreno</h1>
          <p style={styles.subtitle}>Gestión y registro de labores de arado, rastrado y subsolado de suelos</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={styles.contentCard}>
        {activeTab === 'historial' && (
          <div>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Horas de Labor</span>
                <span style={styles.kpiValue}>{totalHours.toFixed(1)} hrs</span>
                <span style={styles.kpiDesc}>Tiempo acumulado de maquinaria</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Inversión Total</span>
                <span style={styles.kpiValue}>${totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span style={styles.kpiDesc}>Costo total de combustible y arriendo</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Costo Promedio/Hora</span>
                <span style={styles.kpiValue}>${avgCostPerHour.toFixed(2)} /hr</span>
                <span style={styles.kpiDesc}>Eficiencia promedio general</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Labor Más Frecuente</span>
                <span style={{ ...styles.kpiValue, fontSize: '20px', textTransform: 'capitalize' }}>{mostFrequentLabor}</span>
                <span style={styles.kpiDesc}>{maxCount > 0 ? `${maxCount} faenas registradas` : 'Sin registros'}</span>
              </div>
            </div>

            {/* List / Table */}
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Historial de Faenas Realizadas</h2>
            </div>

            {prepList.length === 0 ? (
              <div style={styles.emptyState}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22v-8h10M12 14H2v8" />
                  <path d="M22 14c0-2.8-2.2-5-5-5h-2c-1.1 0-2 .9-2 2v3M2 14c0-2.8 2.2-5 5-5h2c1.1 0 2 .9 2 2v3" />
                  <circle cx="7" cy="18" r="4" />
                  <circle cx="17" cy="18" r="4" />
                </svg>
                <p>No se han registrado faenas de preparación de terreno.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('registrar')} style={{ marginTop: '12px' }}>
                  Registrar Primera Labor
                </button>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRowHead}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Lote</th>
                      <th style={styles.th}>Labor</th>
                      <th style={styles.th}>Maquinaria</th>
                      <th style={styles.th}>Operador</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Horas</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Costo</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Costo/Hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepList.map(prep => {
                      const costHr = prep.hours > 0 ? (prep.cost / prep.hours) : 0;
                      return (
                        <tr key={prep.id} style={styles.tableRowBody}>
                          <td style={styles.td}>{prep.date}</td>
                          <td style={styles.td} style={{ fontWeight: 600 }}>{prep.lotName}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              ...(prep.activityType === 'Arado' ? styles.badgeArado : {}),
                              ...(prep.activityType === 'Rastrado' ? styles.badgeRastrado : {}),
                              ...(prep.activityType === 'Subsolado' ? styles.badgeSubsolado : {})
                            }}>
                              {prep.activityType}
                            </span>
                          </td>
                          <td style={styles.td}>{prep.machineName}</td>
                          <td style={styles.td}>{prep.operatorName}</td>
                          <td style={styles.td} style={{ textAlign: 'right', fontWeight: 500 }}>{prep.hours} hrs</td>
                          <td style={styles.td} style={{ textAlign: 'right', fontWeight: 600 }}>${prep.cost.toFixed(2)}</td>
                          <td style={styles.td} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                            ${costHr.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrar' && (
          <div style={styles.formSplitGrid}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Registrar Nueva Faena</h2>
              <p style={styles.guideText}>
                Complete el formulario para dejar constancia de los trabajos mecánicos realizados en los terrenos de cultivo.
              </p>

              <form onSubmit={handleSavePreparation} style={styles.form}>
                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Lote Asociado *</label>
                    <select
                      value={selectedLotId}
                      onChange={(e) => setSelectedLotId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(lots).map(([id, lot]) => (
                        <option key={id} value={id}>{lot.name} ({lot.code})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Tipo de Labor *</label>
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {LABOR_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Fecha de Ejecución *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Maquinaria Utilizada *</label>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(machines).map(([id, mach]) => (
                        <option key={id} value={id}>{mach.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Operador Responsable *</label>
                    <select
                      value={selectedOperatorId}
                      onChange={(e) => setSelectedOperatorId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(staff).map(([id, s]) => (
                        <option key={id} value={id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Horas Trabajadas *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Ej: 8.5"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Costo Total ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="Ej: 320.00"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ width: '100%' }}
                  >
                    {submitting ? 'Guardando...' : 'Registrar Labor de Preparación'}
                  </button>
                </div>
              </form>
            </div>

            <div style={styles.guidePanel}>
              <h3 style={styles.guideTitle}>Pautas de Operación Agrícola</h3>
              <ul style={styles.guideList}>
                <li>
                  <strong>Arado:</strong> Primera etapa de preparación. Se realiza para voltear y aflojar el suelo, mejorando la aireación y eliminando malezas. Recomendable profundidad de 20-25 cm para Cañihua.
                </li>
                <li>
                  <strong>Rastrado:</strong> Desmenuza los terrones de tierra resultantes del arado, creando una cama de siembra fina necesaria para el diminuto grano de Cañihua.
                </li>
                <li>
                  <strong>Subsolado:</strong> Trabajo profundo (+40 cm) para romper la capa dura ("pie de arado"). Crucial en suelos compactados del altiplano para mejorar la retención de agua y penetración de raíces.
                </li>
                <li>
                  <strong>Control de costos:</strong> Asegúrese de que el costo por hora cargado incluya combustible consumido y la tasa de depreciación de la maquinaria seleccionada.
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'metricas' && (
          <div style={styles.metricsContainer}>
            <div style={styles.row}>
              {/* Cost Chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Inversión Acumulada por Labor</h3>
                <p style={styles.chartSubtitle}>Distribución financiera por tipo de preparación</p>

                <div style={styles.chartWrapper}>
                  {LABOR_TYPES.map(type => {
                    const cost = costByLaborType[type] || 0;
                    const percentage = (cost / maxLaborCost) * 100;
                    return (
                      <div key={type} style={styles.chartRow}>
                        <span style={styles.chartRowLabel}>{type}</span>
                        <div style={styles.chartBarBg}>
                          <div
                            style={{
                              ...styles.chartBarFill,
                              width: `${percentage}%`,
                              backgroundColor: 
                                type === 'Arado' ? '#8b4513' : 
                                type === 'Rastrado' ? '#d46b08' : '#324536'
                            }}
                          ></div>
                        </div>
                        <span style={styles.chartRowValue}>${cost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Machinery efficiency */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Costo Operativo por Maquinaria</h3>
                <p style={styles.chartSubtitle}>Costo promedio por hora en base a faenas reales</p>

                <div style={styles.efficiencyList}>
                  {machineEfficiency.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
                      Registre faenas para ver las métricas de eficiencia.
                    </p>
                  ) : (
                    machineEfficiency.map(item => {
                      const isHigh = item.costPerHour > 100;
                      return (
                        <div key={item.id} style={styles.efficiencyItem}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={styles.efficiencyName}>{item.name}</span>
                            <span style={{
                              ...styles.efficiencyValue,
                              color: isHigh ? 'var(--error)' : 'var(--tertiary)'
                            }}>
                              ${item.costPerHour.toFixed(2)} /hr
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span>Total horas: {item.hours.toFixed(1)} hrs</span>
                            <span>Inversión: ${item.cost.toFixed(2)}</span>
                          </div>
                          {isHigh && (
                            <div style={styles.efficiencyAlert}>
                              ⚠️ Costo elevado. Requiere revisión de mantenimiento o consumo de combustible.
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* General Advice banner */}
            <div style={styles.adviceBanner}>
              <div style={{ fontSize: '20px' }}>💡</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Recomendación Agronómica
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Una correcta correlación entre **Subsolado** y **Arado** asegura una excelente infiltración pluvial. En la granja Canaviri, se recomienda realizar subsolado cada 3 campañas para evitar la fatiga y compactación del suelo por el tránsito de tractores.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '28px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '4px 0 0 0',
  },
  tabsContainer: {
    borderBottom: '1px solid var(--outline)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tabButton: {
    padding: '12px 20px',
    fontSize: '13.5px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
    fontWeight: 600,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--outline)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  kpiDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  sectionHeader: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
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
    backgroundColor: 'rgba(108, 47, 0, 0.02)',
  },
  th: {
    padding: '14px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  tableRowBody: {
    borderBottom: '1px solid var(--outline)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
  },
  badgeArado: {
    backgroundColor: '#fff1f0',
    color: '#cf1322',
  },
  badgeRastrado: {
    backgroundColor: '#fff7e6',
    color: '#d46b08',
  },
  badgeSubsolado: {
    backgroundColor: '#f6ffed',
    color: '#389e0d',
  },
  formSplitGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    flexWrap: 'wrap',
  },
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    outline: 'none',
    backgroundColor: 'var(--bg-primary)',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    outline: 'none',
    backgroundColor: 'var(--bg-primary)',
    height: '40px',
  },
  guideText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: '6px 0 16px 0',
  },
  guidePanel: {
    flex: '0 0 320px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
  },
  guideTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--primary)',
    margin: '0 0 12px 0',
  },
  guideList: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    lineHeight: '1.5',
  },
  metricsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  chartCard: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    minWidth: '300px',
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--primary)',
    margin: 0,
  },
  chartSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: '2px 0 16px 0',
  },
  chartWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  chartRowLabel: {
    width: '80px',
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  chartBarBg: {
    flex: 1,
    height: '14px',
    backgroundColor: 'rgba(135, 115, 105, 0.1)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.6s ease-out',
  },
  chartRowValue: {
    width: '80px',
    textAlign: 'right',
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--primary)',
  },
  efficiencyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  efficiencyItem: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
  },
  efficiencyName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  efficiencyValue: {
    fontSize: '14px',
    fontWeight: 700,
  },
  efficiencyAlert: {
    marginTop: '8px',
    fontSize: '11px',
    color: 'var(--error)',
    backgroundColor: 'var(--error-container)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 500,
  },
  adviceBanner: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'var(--primary-light)',
    border: '1px solid rgba(108, 47, 0, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    alignItems: 'flex-start',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
    gap: '16px',
    color: 'var(--text-muted)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--primary-light)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '24px',
    backgroundColor: 'var(--error-container)',
    color: 'var(--error)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  }
};
