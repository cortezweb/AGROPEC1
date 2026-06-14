import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const ROLES = ['Agricultor', 'Operador de Planta', 'Supervisor', 'Logística'];
const SHIFTS = ['Mañana', 'Tarde', 'Noche'];
const STATUSES = ['En Campo', 'En Planta', 'Descanso', 'Licencia'];
const ACTIVITIES = ['Siembra', 'Cosecha', 'Preparación', 'Riego', 'Fertilización', 'Deshierbe', 'Mantenimiento', 'General'];

export default function Staff() {
  const [activeTab, setActiveTab] = useState('personal');
  const [staffList, setStaffList] = useState({});
  const [lots, setLots] = useState({});
  const [staffLogs, setStaffLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states (Register Personnel)
  const [name, setName] = useState('');
  const [role, setRole] = useState('Agricultor');
  const [shift, setShift] = useState('Mañana');
  const [status, setStatus] = useState('Descanso');
  const [assignedTask, setAssignedTask] = useState('');

  // Form states (Register Jornal/Log)
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().substring(0, 10));
  const [activity, setActivity] = useState('Siembra');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('15.00');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Dropdown states for inline editing
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStaffList(data.staff || {});
        setLots(data.lots || {});
        setStaffLogs(data.staff_logs || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Staff):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prepopulate jornal lot & staff dropdowns
  useEffect(() => {
    const staffKeys = Object.keys(staffList);
    const lotKeys = Object.keys(lots);
    if (staffKeys.length > 0 && !selectedStaffId) setSelectedStaffId(staffKeys[0]);
    if (lotKeys.length > 0 && !selectedLotId) setSelectedLotId(lotKeys[0]);
  }, [staffList, lots]);

  const handleRegisterStaff = (e) => {
    e.preventDefault();
    if (!name) {
      alert('Por favor ingrese el nombre del personal.');
      return;
    }

    const staffRef = ref(db, 'staff');
    const newStaffRef = push(staffRef);
    const id = newStaffRef.key;

    set(newStaffRef, {
      id,
      name,
      role,
      shift,
      status,
      assignedTask: assignedTask || 'Sin tarea asignada',
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsModalOpen(false);
      setName('');
      setAssignedTask('');
      setStatus('Descanso');
    }).catch(err => {
      console.error("Error saving staff:", err);
      alert("Error al registrar el personal.");
    });
  };

  const handleSaveJornal = (e) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedLotId || !logDate || !activity || !hours || !hourlyRate) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (Number(hours) <= 0 || Number(hourlyRate) <= 0) {
      alert("Las horas y el costo por hora deben ser números positivos.");
      return;
    }

    setSubmittingLog(true);
    const staffName = staffList[selectedStaffId]?.name || 'Operario Desconocido';
    const lotName = lots[selectedLotId]?.name || 'Lote Desconocido';
    const hrsVal = parseFloat(hours);
    const rateVal = parseFloat(hourlyRate);

    const logsRef = ref(db, 'staff_logs');
    const newLogRef = push(logsRef);
    const id = newLogRef.key;

    const newRecord = {
      id,
      staffId: selectedStaffId,
      staffName,
      lotId: selectedLotId,
      lotName,
      date: logDate,
      activity,
      hours: hrsVal,
      hourlyRate: rateVal,
      totalCost: parseFloat((hrsVal * rateVal).toFixed(2)),
      createdAt: new Date().toISOString()
    };

    set(newLogRef, newRecord)
      .then(() => {
        alert("¡Jornal de trabajo registrado exitosamente!");
        setHours('');
        setSubmittingLog(false);
      })
      .catch((err) => {
        console.error(err);
        alert("Error al registrar el jornal.");
        setSubmittingLog(false);
      });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const memberRef = ref(db, `staff/${id}`);
    update(memberRef, { status: newStatus })
      .then(() => setEditingId(null))
      .catch(err => {
        console.error("Error updating status:", err);
        alert("Error al actualizar el estado.");
      });
  };

  const getStatusBadgeClass = (statusVal) => {
    switch (statusVal) {
      case 'En Campo': return 'badge-crecimiento';
      case 'En Planta': return 'badge-procesamiento';
      case 'Descanso': return 'badge-empacado';
      case 'Licencia': return 'badge-siembra';
      default: return '';
    }
  };

  const list = Object.values(staffList);
  const totalStaff = list.length;
  const activeStaff = list.filter(s => s.status === 'En Campo' || s.status === 'En Planta').length;
  const restingStaff = list.filter(s => s.status === 'Descanso').length;

  const logsList = Object.values(staffLogs).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalLaborCost = logsList.reduce((sum, l) => sum + (l.totalCost || 0), 0);
  const totalHoursWorked = logsList.reduce((sum, l) => sum + (l.hours || 0), 0);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <span>Cargando datos de personal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorBanner}>
        <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión</h3>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Control de Personal y Jornales</h1>
          <p style={styles.subtitle} className="view-subtitle">Supervisa los turnos, ubicaciones, asignaciones y costos laborales de las faenas</p>
        </div>
        {activeTab === 'personal' && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Registrar Personal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer} className="view-tabs-container">
        <div className="view-tabs">
          <button
            onClick={() => setActiveTab('personal')}
            style={{ ...styles.tabButton, ...(activeTab === 'personal' ? styles.tabActive : {}) }}
          >
            Maestro de Personal
          </button>
          <button
            onClick={() => setActiveTab('jornales')}
            style={{ ...styles.tabButton, ...(activeTab === 'jornales' ? styles.tabActive : {}) }}
          >
            Jornales y Costos Laborales
          </button>
        </div>
      </div>

      {activeTab === 'personal' && (
        <div>
          {/* Metrics Cards */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Personal Total</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
                  👤
                </div>
              </div>
              <div className="metric-value">{totalStaff}</div>
              <div className="metric-footer">Colaboradores registrados</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">En Turno Activo</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>
                  ⏱️
                </div>
              </div>
              <div className="metric-value">{activeStaff}</div>
              <div className="metric-footer">Trabajando actualmente</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">En Descanso / Franco</span>
                <div style={{ ...styles.iconBox, backgroundColor: 'var(--outline)' }}>
                  🏡
                </div>
              </div>
              <div className="metric-value">{restingStaff}</div>
              <div className="metric-footer">Fuera de servicio</div>
            </div>
          </div>

          {/* Staff Table */}
          <h3 style={styles.sectionTitle}>Maestro del Equipo de Trabajo</h3>
          <div className="card" style={styles.card}>
            <div style={styles.tableContainer} className="view-table-container">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableRowHead}>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Turno</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Tarea Asignada</th>
                    <th style={styles.th}>Acción Rápida</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(member => (
                    <tr key={member.id} style={styles.tableRowBody}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{member.name}</td>
                      <td style={styles.td}>{member.role}</td>
                      <td style={styles.td}>{member.shift}</td>
                      <td style={styles.td}>
                        {editingId === member.id ? (
                          <select
                            value={member.status}
                            onChange={(e) => handleUpdateStatus(member.id, e.target.value)}
                            style={{ ...styles.select, height: '32px', padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`badge ${getStatusBadgeClass(member.status)}`}>
                            {member.status}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{member.assignedTask}</td>
                      <td style={styles.td}>
                        {editingId === member.id ? (
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Cancelar
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(member.id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Cambiar Estado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jornales' && (
        <div style={styles.formSplitGrid} className="view-form-split-grid">
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={styles.sectionTitle}>Registrar Jornal de Trabajo</h2>
            <form onSubmit={handleSaveJornal} style={styles.form}>
              <div style={styles.row} className="view-form-row">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Colaborador *</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    style={styles.select}
                    required
                  >
                    {list.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Lote Asociado *</label>
                  <select
                    value={selectedLotId}
                    onChange={(e) => setSelectedLotId(e.target.value)}
                    style={styles.select}
                    required
                  >
                    {Object.entries(lots).map(([id, lot]) => (
                      <option key={id} value={id}>{lot.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row} className="view-form-row">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Fecha *</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Actividad *</label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    style={styles.select}
                    required
                  >
                    {ACTIVITIES.map(act => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row} className="view-form-row">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Horas Trabajadas *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="Ej. 8"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={styles.label}>Costo por Hora ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingLog}>
                  {submittingLog ? 'Guardando...' : 'Registrar Jornal'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ flex: 1.5, minWidth: '300px' }} className="view-guide-panel">
            {/* KPIs */}
            <div style={{ ...styles.kpiGrid, gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }} className="view-kpi-grid">
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Costo Laboral Total</span>
                <span style={styles.kpiValue}>${totalLaborCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                <span style={styles.kpiDesc}>Suma total devengada</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Horas Totales Trabajadas</span>
                <span style={styles.kpiValue}>{totalHoursWorked.toFixed(1)} hrs</span>
                <span style={styles.kpiDesc}>Esfuerzo físico acumulado</span>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Historial de Jornales y Actividades</h2>
            {logsList.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No se han registrado jornales aún.</p>
              </div>
            ) : (
              <div style={styles.tableContainer} className="view-table-container">
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRowHead}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Personal</th>
                      <th style={styles.th}>Actividad</th>
                      <th style={styles.th}>Lote</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Horas</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsList.map(log => (
                      <tr key={log.id} style={styles.tableRowBody}>
                        <td style={styles.td}>{log.date}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{log.staffName}</td>
                        <td style={styles.td}>
                          <span style={styles.actBadge}>{log.activity}</span>
                        </td>
                        <td style={styles.td}>{log.lotName}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{log.hours} hrs</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>${log.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register Personnel Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Nuevo Personal</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleRegisterStaff}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Nombre Completo</label>
                <input
                  className="form-input"
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mateo Quispe"
                />
              </div>

              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="role">Rol</label>
                  <select
                    className="form-input"
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="shift">Turno</label>
                  <select
                    className="form-input"
                    id="shift"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="status">Estado Inicial</label>
                <select
                  className="form-input"
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task">Tarea Asignada (Opcional)</label>
                <input
                  className="form-input"
                  type="text"
                  id="task"
                  value={assignedTask}
                  onChange={(e) => setAssignedTask(e.target.value)}
                  placeholder="Ej. Riego de Lote C-01"
                />
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
    marginBottom: '16px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '1px',
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--outline)',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
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
  row: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    borderTop: '1px solid var(--outline)',
    paddingTop: '16px',
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
  formSplitGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--outline)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  kpiDesc: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    border: '1px dashed var(--outline)',
    borderRadius: 'var(--radius-md)',
  },
  actBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '11.5px',
    fontWeight: 600,
  }
};
