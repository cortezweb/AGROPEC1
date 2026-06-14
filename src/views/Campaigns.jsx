import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'gestion', label: 'Gestión de Campañas' },
  { id: 'crear', label: 'Crear Campaña' },
  { id: 'estado', label: 'Estado de Campaña' },
  { id: 'calendario', label: 'Calendario Agrícola' }
];

const STATUSES = ['Planificada', 'Activa', 'Finalizada'];

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState('gestion');
  const [campaigns, setCampaigns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [crop, setCrop] = useState('Cañihua Cupilapaca');
  const [responsible, setResponsible] = useState('');
  const [status, setStatus] = useState('Planificada');

  // Selection for detailed status view
  const [selectedCampId, setSelectedCampId] = useState('');

  useEffect(() => {
    const campaignsRef = ref(db, 'campaigns');
    const unsubscribe = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCampaigns(data);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Campaigns):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const campList = Object.values(campaigns);

  // Set default selected campaign for details once loaded
  useEffect(() => {
    if (campList.length > 0 && !selectedCampId) {
      // Prioritize active campaigns
      const active = campList.find(c => c.status === 'Activa');
      setSelectedCampId(active ? active.id : campList[0].id);
    }
  }, [campaigns]);

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!name || !season || !startDate || !endDate || !responsible) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio.");
      return;
    }

    const campaignsRef = ref(db, 'campaigns');
    const newCampRef = push(campaignsRef);
    const id = newCampRef.key;

    set(newCampRef, {
      id,
      name,
      season,
      startDate,
      endDate,
      crop,
      responsible,
      status
    }).then(() => {
      alert("¡Campaña agrícola creada exitosamente!");
      // Reset form
      setName('');
      setSeason('');
      setStartDate('');
      setEndDate('');
      setResponsible('');
      setStatus('Planificada');
      // Redirect
      setActiveTab('gestion');
    }).catch(err => {
      console.error(err);
      alert("Error al guardar la campaña en Firebase.");
    });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const campRef = ref(db, `campaigns/${id}`);
    update(campRef, { status: newStatus })
      .catch(err => {
        console.error(err);
        alert("Error al actualizar el estado de la campaña.");
      });
  };

  // Arithmetic for campaign progress
  const getCampaignProgress = (camp) => {
    if (!camp) return { totalDays: 0, elapsedDays: 0, percentage: 0 };
    const start = new Date(camp.startDate);
    const end = new Date(camp.endDate);
    const today = new Date();

    const totalTime = end - start;
    const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24));

    if (today < start) {
      return { totalDays, elapsedDays: 0, percentage: 0 };
    }
    if (today > end) {
      return { totalDays, elapsedDays: totalDays, percentage: 100 };
    }

    const elapsedTime = today - start;
    const elapsedDays = Math.ceil(elapsedTime / (1000 * 60 * 60 * 24));
    const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    return { totalDays, elapsedDays, percentage };
  };

  // Status statistics
  const totalCamps = campList.length;
  const activeCamps = campList.filter(c => c.status === 'Activa').length;
  const plannedCamps = campList.filter(c => c.status === 'Planificada').length;
  const completedCamps = campList.filter(c => c.status === 'Finalizada').length;

  const selectedCamp = campaigns[selectedCampId];
  const progress = getCampaignProgress(selectedCamp);

  // SVG Agricultural Calendar Gantt Chart
  const renderGanttChart = () => {
    if (campList.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No hay campañas agrícolas registradas para mostrar en el calendario.
        </div>
      );
    }

    // Sort campaigns by startDate
    const sortedCamps = [...campList].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Get time boundaries
    const startTimes = sortedCamps.map(c => new Date(c.startDate).getTime());
    const endTimes = sortedCamps.map(c => new Date(c.endDate).getTime());
    
    const minTime = Math.min(...startTimes);
    // Add 15 days margin to end
    const maxTime = Math.max(...endTimes) + 15 * 24 * 60 * 60 * 1000;
    const range = maxTime - minTime || 1;

    const width = 600;
    const paddingLeft = 140; // Space for campaign labels
    const paddingRight = 20;
    const chartWidth = width - paddingLeft - paddingRight;
    const rowHeight = 35;
    const height = 40 + sortedCamps.length * rowHeight;

    const getX = (dateStr) => {
      const t = new Date(dateStr).getTime();
      return paddingLeft + ((t - minTime) / range) * chartWidth;
    };

    const formatDateShort = (dateStr) => {
      const d = new Date(dateStr);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    const getStatusColor = (statusVal) => {
      switch (statusVal) {
        case 'Activa': return 'var(--tertiary)';
        case 'Planificada': return 'var(--secondary)';
        case 'Finalizada': return 'var(--text-muted)';
        default: return '#ccc';
      }
    };

    return (
      <div className="card" style={{ padding: '24px' }}>
        <h4 style={{ ...styles.cardTitle, marginBottom: '24px' }}>Cronograma de Campañas Agrícolas (Gantt)</h4>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Background Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const xVal = paddingLeft + r * chartWidth;
              const dateVal = new Date(minTime + r * range);
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const label = `${months[dateVal.getMonth()]} ${dateVal.getFullYear().toString().substring(2)}`;

              return (
                <g key={i}>
                  <line 
                    x1={xVal} 
                    y1={15} 
                    x2={xVal} 
                    y2={height - 20} 
                    stroke="#e4e2e1" 
                    strokeWidth="1" 
                    strokeDasharray="4 4"
                  />
                  <text 
                    x={xVal} 
                    y={height - 5} 
                    textAnchor="middle" 
                    style={{ fontSize: '9px', fill: 'var(--text-muted)', fontWeight: 500 }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Gantt Rows */}
            {sortedCamps.map((camp, idx) => {
              const y = 20 + idx * rowHeight;
              const xStart = getX(camp.startDate);
              const xEnd = getX(camp.endDate);
              const barWidth = Math.max(15, xEnd - xStart);
              const color = getStatusColor(camp.status);

              return (
                <g key={camp.id}>
                  {/* Campaign Name Label (Left Axis) */}
                  <text 
                    x={paddingLeft - 10} 
                    y={y + 16} 
                    textAnchor="end" 
                    style={{ fontSize: '11px', fontWeight: 600, fill: 'var(--text-primary)' }}
                  >
                    {camp.name.substring(0, 18)}
                  </text>
                  
                  {/* Row Line */}
                  <line 
                    x1={paddingLeft} 
                    y1={y + rowHeight / 2} 
                    x2={width - paddingRight} 
                    y2={y + rowHeight / 2} 
                    stroke="#f0eded" 
                    strokeWidth="0.5" 
                  />

                  {/* Duration Bar */}
                  <rect 
                    x={xStart} 
                    y={y + 6} 
                    width={barWidth} 
                    height="18" 
                    fill={color} 
                    rx="4"
                    opacity="0.85"
                  />

                  {/* Crop label inside or next to the bar */}
                  <text 
                    x={xStart + 6} 
                    y={y + 18} 
                    style={{ fontSize: '9px', fill: '#ffffff', fontWeight: 600 }}
                  >
                    {camp.crop}
                  </text>

                  {/* Dates markers above the bar */}
                  <text 
                    x={xStart} 
                    y={y - 1} 
                    style={{ fontSize: '8px', fill: 'var(--text-muted)', fontWeight: 500 }}
                  >
                    {formatDateShort(camp.startDate)}
                  </text>
                  <text 
                    x={xEnd} 
                    y={y - 1} 
                    textAnchor="end" 
                    style={{ fontSize: '8px', fill: 'var(--text-muted)', fontWeight: 500 }}
                  >
                    {formatDateShort(camp.endDate)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Gantt Legend */}
        <div style={styles.legendContainer}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--tertiary)' }}></span>
            <span style={styles.legendLabel}>Campaña Activa</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--secondary)' }}></span>
            <span style={styles.legendLabel}>Planificada</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--text-muted)' }}></span>
            <span style={styles.legendLabel}>Finalizada</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Módulo de Campañas Agrícolas</h1>
          <p style={styles.subtitle}>Planificación estratégica, control de ciclo fenológico y calendario de cultivos de Cañihua</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Metrics grid summary */}
      <div className="metrics-grid" style={{ marginBottom: '32px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Campañas Activas</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>🌾</div>
          </div>
          <div className="metric-value">{activeCamps}</div>
          <div className="metric-footer">En producción actualmente</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Planificadas</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--secondary-container)' }}>📅</div>
          </div>
          <div className="metric-value">{plannedCamps}</div>
          <div className="metric-footer">Próximos ciclos programados</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Histórico Finalizadas</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--outline)' }}>✓</div>
          </div>
          <div className="metric-value">{completedCamps}</div>
          <div className="metric-footer">Ciclos completados con éxito</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabLink,
              ...(activeTab === tab.id ? styles.tabLinkActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Sincronizando campañas agrícolas...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: GESTIÓN DE CAMPAÑAS */}
          {activeTab === 'gestion' && (
            <div>
              <h3 style={styles.sectionTitle}>Maestro de Ciclos de Cultivo</h3>
              <div className="card">
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Nombre Campaña</th>
                        <th style={styles.th}>Gestión</th>
                        <th style={styles.th}>Cultivo</th>
                        <th style={styles.th}>Inicio / Fin</th>
                        <th style={styles.th}>Responsable</th>
                        <th style={styles.th}>Estado</th>
                        <th style={styles.th}>Acción Rápida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No hay campañas registradas</td>
                        </tr>
                      ) : (
                        campList.map(camp => (
                          <tr key={camp.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{camp.name}</td>
                            <td style={styles.td}>{camp.season}</td>
                            <td style={styles.td}>{camp.crop}</td>
                            <td style={styles.td}>{camp.startDate} al {camp.endDate}</td>
                            <td style={styles.td}>{camp.responsible}</td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                camp.status === 'Activa' ? 'badge-cosecha' : camp.status === 'Planificada' ? 'badge-siembra' : 'badge-procesamiento'
                              }`}>
                                {camp.status}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <select
                                value={camp.status}
                                onChange={(e) => handleUpdateStatus(camp.id, e.target.value)}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', display: 'inline-block' }}
                              >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREAR CAMPAÑA */}
          {activeTab === 'crear' && (
            <div style={styles.formSplitGrid}>
              <div style={{ flex: 1.2 }}>
                <h3 style={styles.sectionTitle}>Registrar Nuevo Ciclo Agrícola</h3>
                <div className="card" style={{ padding: '24px' }}>
                  <form onSubmit={handleCreateCampaign}>
                    <div style={styles.row}>
                      <div className="form-group" style={{ flex: 1.5 }}>
                        <label className="form-label" htmlFor="campName">Nombre de la Campaña</label>
                        <input
                          className="form-input"
                          type="text"
                          id="campName"
                          required
                          placeholder="Ej. Campaña Invierno 2026"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="campSeason">Gestión</label>
                        <input
                          className="form-input"
                          type="text"
                          id="campSeason"
                          required
                          placeholder="Ej. Gestión 2026-I"
                          value={season}
                          onChange={(e) => setSeason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="campStart">Fecha de Inicio</label>
                        <input
                          className="form-input"
                          type="date"
                          id="campStart"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="campEnd">Fecha de Fin (Cosecha Est.)</label>
                        <input
                          className="form-input"
                          type="date"
                          id="campEnd"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="campCrop">Cultivo Variedad</label>
                        <select
                          className="form-input"
                          id="campCrop"
                          value={crop}
                          onChange={(e) => setCrop(e.target.value)}
                        >
                          <option value="Cañihua Cupilapaca">Cañihua Cupilapaca</option>
                          <option value="Cañihua Lasti">Cañihua Lasti</option>
                          <option value="Cañihua Saihua">Cañihua Saihua</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="campResp">Ingeniero / Responsable</label>
                        <input
                          className="form-input"
                          type="text"
                          id="campResp"
                          required
                          placeholder="Ej. Hamilton Canaviri"
                          value={responsible}
                          onChange={(e) => setResponsible(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="campStatus">Estado Inicial</label>
                      <select
                        className="form-input"
                        id="campStatus"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                      Inicializar Campaña Agrícola
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={styles.sectionTitle}>Políticas Agronómicas</h3>
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--tertiary-container)', border: '1px solid var(--tertiary)' }}>
                  <h4 style={{ ...styles.cardTitle, color: 'var(--tertiary-dark)' }}>Fases de Planificación</h4>
                  <p style={styles.guideText}>
                    Las campañas agrícolas orquestan el uso de lotes, agua, personal y maquinaria en la Granja Canaviri.
                  </p>
                  <ul style={styles.guideList}>
                    <li><strong>Planificada:</strong> Fase de diseño, cotización de semillas en bodega, y alistamiento de maquinaria para la siembra.</li>
                    <li><strong>Activa:</strong> Ciclo fenológico en curso (Siembra, Riego, Crecimiento). Las lecturas meteorológicas y de sensores se vinculan directamente.</li>
                    <li><strong>Finalizada:</strong> Cosecha terminada. El lote pasa a descanso o rotación y los granos entran a la fase de Procesamiento y Empaque.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ESTADO DE CAMPAÑA */}
          {activeTab === 'estado' && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Avance Físico del Ciclo</h3>
                <div>
                  <label htmlFor="campSelect" style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>Seleccionar Campaña:</label>
                  <select
                    id="campSelect"
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', display: 'inline-block', padding: '6px 12px' }}
                  >
                    {campList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedCamp ? (
                <div className="card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '22px' }}>{selectedCamp.name}</h2>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {selectedCamp.crop} • {selectedCamp.season}
                      </span>
                    </div>
                    <span className={`badge ${
                      selectedCamp.status === 'Activa' ? 'badge-cosecha' : selectedCamp.status === 'Planificada' ? 'badge-siembra' : 'badge-procesamiento'
                    }`} style={{ fontSize: '14px', padding: '8px 16px' }}>
                      Campaña {selectedCamp.status}
                    </span>
                  </div>

                  {/* Progress bar container */}
                  <div style={{ margin: '32px 0 24px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                      <span>Avance Fenológico Temporal</span>
                      <span style={{ color: 'var(--primary)' }}>{progress.percentage}% del Ciclo</span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${progress.percentage}%` }}></div>
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.detailBox}>
                      <span style={styles.detailLabel}>FECHA INICIO</span>
                      <span style={styles.detailValue}>{selectedCamp.startDate}</span>
                    </div>
                    <div style={styles.detailBox}>
                      <span style={styles.detailLabel}>FECHA FIN ESTIMADA</span>
                      <span style={styles.detailValue}>{selectedCamp.endDate}</span>
                    </div>
                    <div style={styles.detailBox}>
                      <span style={styles.detailLabel}>DIAS TRANSCURRIDOS</span>
                      <span style={styles.detailValue}>{progress.elapsedDays} / {progress.totalDays} días</span>
                    </div>
                    <div style={styles.detailBox}>
                      <span style={styles.detailLabel}>RESPONSABLE</span>
                      <span style={styles.detailValue}>{selectedCamp.responsible}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Seleccione una campaña agrícola para visualizar su avance.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CALENDARIO AGRÍCOLA */}
          {activeTab === 'calendario' && (
            <div>
              <h3 style={styles.sectionTitle}>Línea de Tiempo del Año</h3>
              {renderGanttChart()}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '28px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  errorBanner: {
    padding: '16px',
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    borderRadius: 'var(--radius-md)',
    marginBottom: '24px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--outline)',
    marginBottom: '32px',
    overflowX: 'auto',
    paddingBottom: '1px',
  },
  tabLink: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  tabLinkActive: {
    color: 'var(--primary)',
    fontWeight: 600,
    borderBottomColor: 'var(--primary)',
  },
  loaderContainer: {
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
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '16px',
    fontFamily: 'var(--font-headline)',
  },
  formSplitGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  row: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    flexWrap: 'wrap'
  },
  guideText: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  guideList: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    paddingLeft: '20px',
    lineHeight: '1.7',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    '&:hover': {
      backgroundColor: 'rgba(108, 47, 0, 0.01)',
    }
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  progressBarBg: {
    width: '100%',
    height: '12px',
    backgroundColor: 'var(--outline)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--primary)',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.4s ease',
  },
  detailBox: {
    flex: 1,
    minWidth: '130px',
    padding: '16px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  legendContainer: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    marginTop: '24px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  }
};
