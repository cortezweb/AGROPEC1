import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const ROLES = ['Agricultor', 'Operador de Planta', 'Supervisor', 'Logística'];
const SHIFTS = ['Mañana', 'Tarde', 'Noche'];
const STATUSES = ['En Campo', 'En Planta', 'Descanso', 'Licencia'];

export default function Staff() {
  const [staffList, setStaffList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Agricultor');
  const [shift, setShift] = useState('Mañana');
  const [status, setStatus] = useState('Descanso');
  const [assignedTask, setAssignedTask] = useState('');

  // Dropdown states for inline editing
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const staffRef = ref(db, 'staff');
    const unsubscribe = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStaffList(data);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Staff):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
      alert("Error al registrar el personal en Firebase.");
    });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const memberRef = ref(db, `staff/${id}`);
    update(memberRef, { status: newStatus })
      .then(() => setEditingId(null))
      .catch(err => {
        console.error("Error updating status:", err);
        alert("Error al actualizar el estado en Firebase.");
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

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Control de Personal y Turnos</h1>
          <p style={styles.subtitle}>Supervisa los turnos, ubicaciones y tareas asignadas al equipo de la granja</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar Personal
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Personal Total</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{totalStaff}</div>
          <div className="metric-footer">Colaboradores registrados</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">En Turno Activo</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{activeStaff}</div>
          <div className="metric-footer">Trabajando actualmente</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">En Descanso / Franco</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'var(--outline)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{restingStaff}</div>
          <div className="metric-footer">Fuera de servicio</div>
        </div>
      </div>

      {/* Staff Table */}
      <h3 style={styles.sectionTitle}>Maestro del Equipo de Trabajo</h3>
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Cargando datos del equipo...</span>
        </div>
      ) : (
        <div className="card">
          <div style={styles.tableContainer}>
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
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
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
                          className="btn btn-tertiary"
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

              <div style={styles.row}>
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
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    marginBottom: '16px',
    marginTop: '32px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  row: {
    display: 'flex',
    gap: '16px',
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
};
