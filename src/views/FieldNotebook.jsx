import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';

const TABS = [
  { id: 'calendar', label: 'Calendario de Campo' },
  { id: 'timeline', label: 'Línea de Tiempo' },
  { id: 'registrar', label: 'Nueva Anotación' },
  { id: 'oficial', label: 'Formato Oficial SENASA' }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas las Actividades' },
  { id: 'crop-cycle', label: 'Siembra y Cosecha' },
  { id: 'land-preparation', label: 'Prep. de Terreno' },
  { id: 'soil-analysis', label: 'Análisis de Suelo' },
  { id: 'crop-protection', label: 'Nutrición y Plagas' },
  { id: 'irrigation', label: 'Riego y Agua' },
  { id: 'note', label: 'Notas de Operador' }
];

const NOTE_CATEGORIES = [
  'General / Observación',
  'Clima y Temperatura',
  'Sanidad / Alerta de Plaga',
  'Labor Cultural / Deshierbe',
  'Incidente / Avería'
];

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function FieldNotebook() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Database states
  const [lots, setLots] = useState({});
  const [staff, setStaff] = useState({});
  const [cropCycles, setCropCycles] = useState({});
  const [landPrep, setLandPrep] = useState({});
  const [soilAnalysis, setSoilAnalysis] = useState({});
  const [fertilizations, setFertilizations] = useState({});
  const [pests, setPests] = useState({});
  const [irrigationLogs, setIrrigationLogs] = useState({});
  const [customNotes, setCustomNotes] = useState({});

  // Filters
  const [selectedLotFilter, setSelectedLotFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar view states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().substring(0, 10));

  // Form states
  const [noteDate, setNoteDate] = useState(new Date().toISOString().substring(0, 10));
  const [noteLotId, setNoteLotId] = useState('');
  const [noteCategory, setNoteCategory] = useState('General / Observación');
  const [noteOperatorId, setNoteOperatorId] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all agricultural data from Firebase
  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setStaff(data.staff || {});
        setCropCycles(data.crop_cycles || {});
        setLandPrep(data.land_preparation || {});
        setSoilAnalysis(data.soil_analysis || {});
        setFertilizations(data.crop_fertilizations || {});
        setPests(data.crop_pests || {});
        setIrrigationLogs(data.irrigation_logs || {});
        setCustomNotes(data.field_notebook_notes || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (FieldNotebook):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default form selections once data is loaded
  useEffect(() => {
    const lotKeys = Object.keys(lots);
    const staffKeys = Object.keys(staff);

    if (lotKeys.length > 0 && !noteLotId) setNoteLotId(lotKeys[0]);
    if (staffKeys.length > 0 && !noteOperatorId) setNoteOperatorId(staffKeys[0]);
  }, [lots, staff]);

  // Combine and normalize all logs chronologically
  const getCombinedLogs = () => {
    const combined = [];

    // 1. Soil Analysis
    Object.values(soilAnalysis).forEach(sa => {
      combined.push({
        id: `soil-${sa.id}`,
        date: sa.date,
        type: 'soil-analysis',
        lotId: sa.lotId,
        lotName: sa.lotName || lots[sa.lotId]?.name || 'Lote Desconocido',
        category: 'soil-analysis',
        details: `Análisis de Suelo realizado. Parámetros detectados: pH: ${sa.ph}, Materia Orgánica: ${sa.organicMatter}%, Nitrógeno: ${sa.nitrogen} ppm, Fósforo: ${sa.phosphorus} ppm, Potasio: ${sa.potassium} ppm.`,
        inputs: sa.pdfName && sa.pdfName !== "Sin archivo PDF adjunto" ? `Archivo: ${sa.pdfName}` : 'Sin insumos / Datos directos',
        operator: 'Laboratorio Externo (Reporte)',
        raw: sa
      });
    });

    // 2. Land Preparation
    Object.values(landPrep).forEach(lp => {
      combined.push({
        id: `prep-${lp.id}`,
        date: lp.date,
        type: 'land-preparation',
        lotId: lp.lotId,
        lotName: lots[lp.lotId]?.name || 'Lote Desconocido',
        category: 'land-preparation',
        details: `Labor de Preparación de Suelo: ${lp.activityType} realizada utilizando maquinaria. Horas de operación: ${lp.hours} hrs. Costo total: $${lp.cost}.`,
        inputs: lp.machineName ? `Maquinaria: ${lp.machineName}` : 'Maquinaria general',
        operator: lp.operatorName || staff[lp.operatorId]?.name || 'Operador',
        raw: lp
      });
    });

    // 3. Crop Cycles (Sowing and Harvest events)
    Object.values(cropCycles).forEach(cc => {
      // Sowing
      if (cc.plantingDate) {
        combined.push({
          id: `sow-${cc.id}`,
          date: cc.plantingDate,
          type: 'crop-cycle',
          lotId: cc.lotId,
          lotName: lots[cc.lotId]?.name || 'Lote Desconocido',
          category: 'crop-cycle',
          details: `Siembra de cultivo de Cañihua. Variedad sembrada: ${cc.variety}. Ciclo estimado de cosecha: ${cc.estimatedHarvestDate || 'Por definir'}. Estado inicial: ${cc.status || 'En crecimiento'}.`,
          inputs: `Semilla certificada - Cañihua (${cc.variety})`,
          operator: lots[cc.lotId]?.producer || 'Agrónomo de Campo',
          raw: cc
        });
      }

      // Harvest (if status is 'Cosechado' or has production)
      if (cc.status === 'Cosechado' && cc.harvestDate) {
        combined.push({
          id: `harv-${cc.id}`,
          date: cc.harvestDate || cc.updatedAt?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          type: 'crop-cycle',
          lotId: cc.lotId,
          lotName: lots[cc.lotId]?.name || 'Lote Desconocido',
          category: 'crop-cycle',
          details: `Cosecha y recolección completada. Rendimiento de producción total: ${cc.production || 0} toneladas. Estado del ciclo: Cosechado y cerrado.`,
          inputs: 'Ninguno (Egreso de producción)',
          operator: lots[cc.lotId]?.producer || 'Operadores de Cosecha',
          raw: cc
        });
      }
    });

    // 4. Fertilizations (Nutrition)
    Object.values(fertilizations).forEach(f => {
      combined.push({
        id: `fert-${f.id}`,
        date: f.date,
        type: 'crop-protection',
        lotId: f.lotId,
        lotName: lots[f.lotId]?.name || 'Lote Desconocido',
        category: 'crop-protection',
        details: `Aplicación de Nutrición/Fertilizante. Producto: ${f.product}. Objetivo: ${f.target || 'Mejora de rendimiento'}. Cantidad aplicada: ${f.quantity} kg/litros. Costo: $${f.cost}.`,
        inputs: `${f.product} (${f.quantity} kg/L)`,
        operator: staff[f.operatorId]?.name || 'Técnico de Campo',
        raw: f
      });
    });

    // 5. Pests (Crop Protection)
    Object.values(pests).forEach(p => {
      combined.push({
        id: `pest-${p.id}`,
        date: p.date,
        type: 'crop-protection',
        lotId: p.lotId,
        lotName: lots[p.lotId]?.name || 'Lote Desconocido',
        category: 'crop-protection',
        details: `Aplicación de Tratamiento Fitosanitario. Plaga controlada: ${p.pestName}. Tratamiento / Producto: ${p.treatment}. Estado de la alerta: ${p.alert}.`,
        inputs: `${p.treatment} (Tratamiento Fitosanitario)`,
        operator: 'Equipo de Sanidad Vegetal',
        raw: p
      });
    });

    // 6. Irrigation Logs
    Object.values(irrigationLogs).forEach(i => {
      combined.push({
        id: `irr-${i.id}`,
        date: i.date,
        type: 'irrigation',
        lotId: i.lotId,
        lotName: lots[i.lotId]?.name || 'Lote Desconocido',
        category: 'irrigation',
        details: `Riego tecnificado aplicado al lote. Volumen total de agua consumida: ${i.waterConsumed} m³. Tiempo de riego: ${i.hours} horas.`,
        inputs: `Agua de Riego: ${i.waterConsumed} m³`,
        operator: 'Sistema de Riego Automático',
        raw: i
      });
    });

    // 7. Custom Field Notes
    Object.values(customNotes).forEach(n => {
      combined.push({
        id: `note-${n.id}`,
        date: n.date,
        type: 'note',
        lotId: n.lotId,
        lotName: lots[n.lotId]?.name || 'Lote Desconocido',
        category: 'note',
        details: `[Anotación de Bitácora - ${n.category}] ${n.description}`,
        inputs: 'Nota de campo manual',
        operator: staff[n.operatorId]?.name || n.operatorName || 'Operador de Campo',
        raw: n
      });
    });

    // Sort by date descending, then by ID
    return combined.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA - dateB !== 0) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  };

  const allLogs = getCombinedLogs();

  // Filter logs based on UI selectors
  const filteredLogs = allLogs.filter(log => {
    const matchLot = selectedLotFilter === 'all' || log.lotId === selectedLotFilter;
    const matchCategory = selectedCategoryFilter === 'all' || log.category === selectedCategoryFilter;
    
    const query = searchQuery.toLowerCase();
    const matchSearch = !query || 
      log.details.toLowerCase().includes(query) ||
      log.lotName.toLowerCase().includes(query) ||
      log.operator.toLowerCase().includes(query) ||
      log.inputs.toLowerCase().includes(query);

    return matchLot && matchCategory && matchSearch;
  });

  // Handle Note Submission
  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!noteLotId || !noteDate || !noteCategory || !noteOperatorId || !noteDescription.trim()) {
      alert("Por favor, rellene todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);

    const notesRef = ref(db, 'field_notebook_notes');
    const newNoteRef = push(notesRef);
    const id = newNoteRef.key;

    const selectedLot = lots[noteLotId];
    const selectedOperator = staff[noteOperatorId];

    const newNote = {
      id,
      lotId: noteLotId,
      lotName: selectedLot ? selectedLot.name : "Lote Desconocido",
      date: noteDate,
      category: noteCategory,
      operatorId: noteOperatorId,
      operatorName: selectedOperator ? selectedOperator.name : "Operador Desconocido",
      description: noteDescription.trim(),
      createdAt: new Date().toISOString()
    };

    set(newNoteRef, newNote)
      .then(() => {
        alert("¡Nota de cuaderno de campo registrada exitosamente!");
        // Reset form
        setNoteDescription('');
        setSubmitting(false);
        // Set calendar focus to this date
        const noteDateObj = new Date(noteDate);
        setCurrentYear(noteDateObj.getFullYear());
        setCurrentMonth(noteDateObj.getMonth());
        setSelectedDateStr(noteDate);
        // Redirect to calendar
        setActiveTab('calendar');
      })
      .catch((err) => {
        console.error("Error writing note to Firebase:", err);
        alert("Error al guardar la nota: " + err.message);
        setSubmitting(false);
      });
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Calendar Helper: Generate the grid cells of the month
  const getCalendarCells = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // getDay returns 0 for Sunday. Let's map so 0 is Monday, ..., 6 is Sunday
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Previous month's overlapping days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      let y = currentYear;
      let m = currentMonth - 1;
      if (m < 0) { m = 11; y--; }
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // Next month's overlapping days
    const totalCells = cells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      let y = currentYear;
      let m = currentMonth + 1;
      if (m > 11) { m = 0; y++; }
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dayNum: i, dateStr, isCurrentMonth: false });
    }

    return cells;
  };

  const calendarCells = getCalendarCells();

  // Navigation handlers for calendar
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Group filtered events by date string (YYYY-MM-DD) for calendar matching
  const eventsByDate = filteredLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {});

  // Get events of the selected day
  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={styles.spinner}></div>
        <p>Cargando registros del cuaderno de campo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error al conectar con Firebase</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* View Header */}
      <div className="view-header" style={styles.header}>
        <div>
          <h1 className="view-title" style={styles.title}>Cuaderno de Campo Digital</h1>
          <p className="view-subtitle" style={styles.subtitle}>
            Historial de trazabilidad, labores agronómicas e incidentes de la Granja Canaviri
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="view-tabs-container" style={styles.tabsContainer}>
        <div className="view-tabs" style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shared Filters Card (Used by Calendar and Timeline) */}
      {(activeTab === 'calendar' || activeTab === 'timeline') && (
        <div className="card" style={styles.filterCard}>
          <div style={styles.filterGrid}>
            {/* Lot Filter */}
            <div style={styles.filterCol}>
              <label style={styles.label}>Filtrar por Lote:</label>
              <select
                value={selectedLotFilter}
                onChange={(e) => setSelectedLotFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">Todos los Lotes</option>
                {Object.entries(lots).map(([id, lot]) => (
                  <option key={id} value={id}>{lot.name} ({lot.code})</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div style={styles.filterCol}>
              <label style={styles.label}>Filtrar por Actividad:</label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                style={styles.select}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div style={styles.filterColFull}>
              <label style={styles.label}>Buscar en el Cuaderno:</label>
              <div style={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Buscar por labor, insumo, operador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.inputSearch}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Render */}
      <div style={styles.content}>
        {activeTab === 'calendar' && (
          <div style={styles.calendarTabWrapper}>
            {/* Calendar Widget */}
            <div className="card" style={styles.calendarCard}>
              {/* Month Header Controller */}
              <div style={styles.calendarHeader}>
                <button onClick={handlePrevMonth} style={styles.calNavBtn} aria-label="Mes anterior">
                  ❮
                </button>
                <h2 style={styles.calendarMonthTitle}>
                  {MONTHS_ES[currentMonth]} {currentYear}
                </h2>
                <button onClick={handleNextMonth} style={styles.calNavBtn} aria-label="Siguiente mes">
                  ❯
                </button>
              </div>

              {/* Day names row */}
              <div style={styles.dayNamesRow}>
                {DAYS_ES.map(day => (
                  <div key={day} style={styles.dayNameCell}>{day}</div>
                ))}
              </div>

              {/* Day cells grid */}
              <div style={styles.daysGrid}>
                {calendarCells.map(cell => {
                  const hasEvents = eventsByDate[cell.dateStr]?.length > 0;
                  const dayEvents = eventsByDate[cell.dateStr] || [];
                  const isSelected = selectedDateStr === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      style={{
                        ...styles.dayCell,
                        ...(!cell.isCurrentMonth ? styles.dayCellOutside : {}),
                        ...(isSelected ? styles.dayCellSelected : {})
                      }}
                    >
                      <span style={{
                        ...styles.dayNum,
                        ...(isSelected ? styles.dayNumSelected : {})
                      }}>
                        {cell.dayNum}
                      </span>
                      
                      {/* Dots Row */}
                      {hasEvents && (
                        <div style={styles.dotsRow}>
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <span
                              key={ev.id}
                              style={{
                                ...styles.dot,
                                backgroundColor: getLogTheme(ev.type).color
                              }}
                              title={getLogTheme(ev.type).label}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span style={styles.moreDotCount}>
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details Panel */}
            <div style={styles.dayDetailsPanel}>
              <div className="card" style={styles.detailsCard}>
                <h3 style={styles.detailsTitle}>
                  Actividades el {formatFullDateString(selectedDateStr)}
                </h3>

                {selectedDayEvents.length === 0 ? (
                  <div style={styles.emptyDayDetails}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      No hay actividades registradas en el cuaderno para esta fecha.
                    </p>
                    <button
                      onClick={() => {
                        setNoteDate(selectedDateStr);
                        setActiveTab('registrar');
                      }}
                      className="btn"
                      style={styles.addNoteBtnInline}
                    >
                      + Registrar Nota
                    </button>
                  </div>
                ) : (
                  <div style={styles.eventsList}>
                    {selectedDayEvents.map(log => {
                      const theme = getLogTheme(log.type);
                      return (
                        <div key={log.id} style={{ ...styles.eventItem, borderLeftColor: theme.color }}>
                          <div style={styles.eventItemHeader}>
                            <span style={styles.eventLotBadge}>{log.lotName}</span>
                            <span style={{ ...styles.eventCategoryBadge, backgroundColor: theme.bg, color: theme.color }}>
                              {theme.label}
                            </span>
                          </div>
                          <p style={styles.eventDescription}>{log.details}</p>
                          <div style={styles.eventMetaRow}>
                            <span><strong>Insumos:</strong> {log.inputs}</span>
                            <span><strong>Responsable:</strong> {log.operator}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {/* Timeline Log List */}
            {filteredLogs.length === 0 ? (
              <div className="card" style={styles.emptyCard}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M9 9h6M9 13h6" />
                </svg>
                <h3>No se encontraron registros</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  Intenta cambiar los filtros seleccionados o realiza otra búsqueda.
                </p>
              </div>
            ) : (
              <div style={styles.timelineContainer}>
                {filteredLogs.map((log) => {
                  const logTheme = getLogTheme(log.type);
                  return (
                    <div key={log.id} style={styles.timelineItem}>
                      {/* Left Date Column */}
                      <div style={styles.timelineDateCol}>
                        <span style={styles.timelineDateText}>{formatDateString(log.date)}</span>
                        <span style={styles.timelineYearText}>{log.date.substring(0, 4)}</span>
                      </div>

                      {/* Timeline Dot & Line */}
                      <div style={styles.timelineMarker}>
                        <div style={{ ...styles.timelineDot, backgroundColor: logTheme.color }}>
                          {logTheme.icon}
                        </div>
                        <div style={styles.timelineLine}></div>
                      </div>

                      {/* Timeline Card */}
                      <div className="card" style={styles.timelineCard}>
                        {/* Mobile Date Badge */}
                        <div style={styles.mobileDateBadge}>
                          {formatDateString(log.date)}
                        </div>

                        <div style={styles.cardHeader}>
                          <span style={styles.cardLotBadge}>
                            {log.lotName}
                          </span>
                          <span style={{ ...styles.categoryBadge, backgroundColor: logTheme.bg, color: logTheme.color }}>
                            {logTheme.label}
                          </span>
                        </div>

                        <p style={styles.cardDetails}>{log.details}</p>

                        <div style={styles.cardFooter}>
                          <div style={styles.footerItem}>
                            <strong style={styles.footerLabel}>Insumos/Recursos:</strong>
                            <span style={styles.footerValue}>{log.inputs}</span>
                          </div>
                          <div style={styles.footerItem}>
                            <strong style={styles.footerLabel}>Responsable:</strong>
                            <span style={styles.footerValue}>{log.operator}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="card" style={styles.formCard}>
            <h2 style={styles.formTitle}>Registrar Nueva Nota en la Bitácora</h2>
            <p style={styles.formSubtitle}>
              Utiliza esta sección para anotar condiciones climáticas, reportar plagas visibles, o registrar cualquier labor de campo manual.
            </p>

            <form onSubmit={handleSaveNote} style={styles.form}>
              <div style={styles.formRow}>
                {/* Date Input */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha del Suceso: *</label>
                  <input
                    type="date"
                    required
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Lot Select */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lote Agrícola: *</label>
                  <select
                    required
                    value={noteLotId}
                    onChange={(e) => setNoteLotId(e.target.value)}
                    style={styles.select}
                  >
                    {Object.entries(lots).map(([id, lot]) => (
                      <option key={id} value={id}>{lot.name} ({lot.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                {/* Category Selection */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoría de Bitácora: *</label>
                  <select
                    required
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    style={styles.select}
                  >
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Responsible Operator */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Responsable: *</label>
                  <select
                    required
                    value={noteOperatorId}
                    onChange={(e) => setNoteOperatorId(e.target.value)}
                    style={styles.select}
                  >
                    {Object.entries(staff).map(([id, s]) => (
                      <option key={id} value={id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observation Detail */}
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Detalle y Observaciones: *</label>
                <textarea
                  required
                  placeholder="Describe detalladamente el suceso, clima, labor o incidencia observada en el lote..."
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  style={styles.textarea}
                  rows={5}
                />
              </div>

              {/* Submit Buttons */}
              <div style={styles.btnRow}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Guardando...' : 'Guardar en Cuaderno'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'oficial' && (
          <div>
            {/* Header Controls for Printing */}
            <div className="card no-print" style={styles.printHeaderCard}>
              <div style={styles.printHeaderFlex}>
                <div>
                  <h3>Formato Oficial de Auditoría de Campo</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                    Esta tabla reúne y ordena los registros requeridos por el reglamento fitosanitario nacional (SENASA) para la certificación orgánica y de exportación.
                  </p>
                </div>
                <button onClick={handlePrint} className="btn" style={styles.printBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Imprimir / Descargar PDF
                </button>
              </div>
            </div>

            {/* Official Agricultural Book Printable View */}
            <div className="print-area" style={styles.printContainer}>
              {/* Report Document Header (Visible in print) */}
              <div className="print-only" style={styles.reportHeader}>
                <div style={styles.reportTitleBlock}>
                  <h2 style={{ fontFamily: 'var(--font-headline)', color: 'var(--primary)', margin: 0 }}>GRANJA AGRÍCOLA CANAVIRI</h2>
                  <h3 style={{ fontSize: '14px', letterSpacing: '0.05em', marginTop: '4px', margin: '4px 0 0 0' }}>CUADERNO DE CAMPO OFICIAL DE TRAZABILIDAD</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Cultivo: Cañihua Orgánica Andina | Ubicación: Puno, Altiplano</p>
                </div>
                <div style={styles.reportMetaBlock}>
                  <p style={{ margin: 0 }}><strong>Fecha Reporte:</strong> {new Date().toISOString().substring(0, 10)}</p>
                  <p style={{ margin: '4px 0 0 0' }}><strong>Auditoría:</strong> SENASA / Certif. Orgánica</p>
                </div>
              </div>

              {/* Official Table */}
              <div className="view-table-container" style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Lote / Parcelas</th>
                      <th style={styles.th}>Labor / Actividad</th>
                      <th style={styles.th}>Detalles del Manejo Agronómico</th>
                      <th style={styles.th}>Productos / Insumos Aplicados</th>
                      <th style={styles.th}>Responsable / Operador</th>
                      <th style={styles.thSignature}>Firma / V°B°</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.map((log) => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{log.date}</td>
                        <td style={styles.td}><strong>{log.lotName}</strong></td>
                        <td style={styles.td}>
                          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: getLogTheme(log.type).color }}>
                            {getLogTheme(log.type).label}
                          </span>
                        </td>
                        <td style={styles.td}>{log.details}</td>
                        <td style={styles.td}>{log.inputs}</td>
                        <td style={styles.td}>{log.operator}</td>
                        <td style={styles.tdSignature}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Printable Signatures */}
              <div className="print-only" style={styles.signatureBlock}>
                <div style={styles.signatureLine}>
                  <div style={styles.signatureSpace}></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Responsable Técnico de Campo</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Granja Agrícola Canaviri</p>
                </div>
                <div style={styles.signatureLine}>
                  <div style={styles.signatureSpace}></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>V°B° Inspector Auditor</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Ente Certificador / SENASA</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded print stylesheets */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
            background: transparent !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .print-only {
            display: flex !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      ` }} />
    </div>
  );
}

// Helpers
function formatDateString(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${months[monthIdx]}`;
}

function formatFullDateString(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, monthIdx, day);
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const weekday = weekdays[dateObj.getDay()];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const month = months[monthIdx];
  return `${weekday} ${day} de ${month}, ${year}`;
}

function getLogTheme(type) {
  switch (type) {
    case 'crop-cycle':
      return {
        label: 'Siembra y Cosecha',
        color: '#2e7d32', // green
        bg: '#e8f5e9',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        )
      };
    case 'land-preparation':
      return {
        label: 'Preparación Terreno',
        color: '#a0522d', // sienna/brown
        bg: '#fdf5e6',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22v-8h10M12 14H2v8" />
          </svg>
        )
      };
    case 'soil-analysis':
      return {
        label: 'Análisis de Suelo',
        color: '#d4af37', // gold
        bg: '#fffdf0',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2h12M10 2v7.586l-4 4V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6.414l-4-4V2" />
          </svg>
        )
      };
    case 'crop-protection':
      return {
        label: 'Nutrición / Sanidad',
        color: '#8b0000', // red/dark red
        bg: '#ffe4e1',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )
      };
    case 'irrigation':
      return {
        label: 'Riego Aplicado',
        color: '#0066cc', // blue
        bg: '#e6f2ff',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
          </svg>
        )
      };
    case 'note':
      return {
        label: 'Nota de Bitácora',
        color: '#6c2f00', // terracota
        bg: '#ffdbc9',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )
      };
    default:
      return {
        label: 'Registro General',
        color: '#54433a',
        bg: '#f0edea',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
  }
}

// Styling definitions
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  tabsContainer: {
    borderBottom: '1px solid var(--outline)',
    marginBottom: '8px',
  },
  tabs: {
    display: 'flex',
    gap: '12px',
  },
  tabButton: {
    padding: '12px 18px',
    fontSize: '14.5px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabButtonActive: {
    color: 'var(--primary)',
    fontWeight: 700,
    borderBottomColor: 'var(--primary)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  filterCard: {
    padding: '20px 24px',
  },
  filterGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  },
  filterCol: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterColFull: {
    flex: '2 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  select: {
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputSearch: {
    padding: '10px 14px',
    paddingRight: '36px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyCard: {
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTabWrapper: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  calendarCard: {
    flex: '1 1 500px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  calendarMonthTitle: {
    fontSize: '20px',
    fontFamily: 'var(--font-headline)',
    margin: 0,
    color: 'var(--primary)',
  },
  calNavBtn: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--primary)',
    width: '36px',
    height: '36px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'var(--primary-light)',
    }
  },
  dayNamesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    marginBottom: '10px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '8px',
  },
  dayNameCell: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
  },
  dayCell: {
    minHeight: '75px',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    '&:hover': {
      borderColor: 'var(--primary)',
      backgroundColor: 'rgba(108, 47, 0, 0.02)',
    }
  },
  dayCellOutside: {
    backgroundColor: 'var(--bg-primary)',
    opacity: 0.5,
  },
  dayCellSelected: {
    borderColor: 'var(--primary)',
    boxShadow: '0 0 0 2px var(--primary-light)',
  },
  dayNum: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    alignSelf: 'flex-start',
  },
  dayNumSelected: {
    color: 'var(--primary)',
    fontWeight: 700,
  },
  dotsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3px',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    minHeight: '8px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  moreDotCount: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    lineHeight: 1,
  },
  dayDetailsPanel: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
  },
  detailsCard: {
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '380px',
  },
  detailsTitle: {
    fontSize: '16px',
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
    margin: '0 0 16px 0',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '12px',
  },
  emptyDayDetails: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '32px 16px',
  },
  addNoteBtnInline: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    fontSize: '12.5px',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    marginTop: '12px',
    cursor: 'pointer',
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
    maxHeight: '400px',
    paddingRight: '4px',
  },
  eventItem: {
    backgroundColor: 'var(--bg-primary)',
    borderLeft: '4px solid #54433a',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  eventItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  eventLotBadge: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  eventCategoryBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
  },
  eventDescription: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: 1.4,
    margin: 0,
  },
  eventMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
    borderTop: '1px dashed var(--outline)',
    paddingTop: '6px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    paddingLeft: '0px',
  },
  timelineItem: {
    display: 'flex',
    gap: '20px',
    position: 'relative',
  },
  timelineDateCol: {
    width: '80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingTop: '18px',
    flexShrink: 0,
  },
  timelineDateText: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  timelineYearText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  timelineMarker: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '32px',
    flexShrink: 0,
  },
  timelineDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    zIndex: 2,
    boxShadow: '0 2px 6px rgba(108, 47, 0, 0.15)',
  },
  timelineLine: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: 'var(--outline)',
    marginTop: '4px',
    marginBottom: '4px',
  },
  timelineCard: {
    flexGrow: 1,
    padding: '20px',
    marginBottom: '24px',
  },
  mobileDateBadge: {
    display: 'none',
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-light)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    alignSelf: 'flex-start',
    marginBottom: '10px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  cardLotBadge: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  categoryBadge: {
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  cardDetails: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    marginBottom: '14px',
  },
  cardFooter: {
    borderTop: '1px solid var(--outline)',
    paddingTop: '12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  footerItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  footerLabel: {
    fontSize: '10.5px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  footerValue: {
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  formCard: {
    padding: '32px',
  },
  formTitle: {
    fontSize: '22px',
    margin: 0,
    color: 'var(--primary)',
  },
  formSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '6px',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: '1 1 240px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  textarea: {
    padding: '12px 14px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
  },
  btnRow: {
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  printHeaderCard: {
    padding: '16px 24px',
    marginBottom: '12px',
  },
  printHeaderFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  printBtn: {
    backgroundColor: 'var(--tertiary)',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  printContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    boxShadow: 'var(--shadow-sm)',
  },
  reportHeader: {
    display: 'none',
    justifyContent: 'space-between',
    borderBottom: '2px solid var(--primary)',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  reportTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  reportMetaBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '13px',
    gap: '4px',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--primary)',
    fontWeight: 700,
    borderBottom: '2px solid var(--outline)',
  },
  thSignature: {
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--primary)',
    fontWeight: 700,
    borderBottom: '2px solid var(--outline)',
    width: '120px',
  },
  tr: {
    borderBottom: '1px solid var(--outline)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px 16px',
    color: 'var(--text-primary)',
    lineHeight: 1.4,
  },
  tdSignature: {
    padding: '12px 16px',
    borderLeft: '1px dashed var(--outline)',
  },
  signatureBlock: {
    display: 'none',
    justifyContent: 'space-around',
    marginTop: '60px',
    pageBreakInside: 'avoid',
  },
  signatureLine: {
    width: '240px',
    textAlign: 'center',
    fontSize: '12px',
  },
  signatureSpace: {
    borderBottom: '1px solid var(--text-primary)',
    height: '50px',
    marginBottom: '8px',
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
