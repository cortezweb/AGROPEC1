import React, { useState } from 'react';

export default function LotFormModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('Cupilapaca');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('Siembra');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().substring(0, 10));
  const [targetHumidity, setTargetHumidity] = useState('65');
  const [targetTemp, setTargetTemp] = useState('14');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !area) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    onSave({
      name,
      variety,
      area: parseFloat(area),
      status,
      plantingDate,
      targetHumidity: parseFloat(targetHumidity),
      targetTemp: parseFloat(targetTemp),
      currentHumidity: parseFloat(targetHumidity) - (Math.random() * 5),
      currentTemp: parseFloat(targetTemp) + (Math.random() * 2 - 1),
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setName('');
    setArea('');
    setStatus('Siembra');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Registrar Nuevo Lote</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Identificador del Lote *</label>
            <input
              className="form-input"
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Lote Canaviri C-14"
            />
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="variety">Variedad de Cañihua</label>
              <select
                className="form-input"
                id="variety"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
              >
                <option value="Cupilapaca">Cupilapaca</option>
                <option value="Lasti">Lasti</option>
                <option value="Saihua">Saihua</option>
                <option value="Ramis">Ramis</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="area">Área (Hectáreas) *</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                id="area"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej. 2.8"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="status">Estado Inicial</label>
              <select
                className="form-input"
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Siembra">Siembra</option>
                <option value="Crecimiento">Crecimiento</option>
                <option value="Cosecha">Cosecha</option>
                <option value="Procesamiento">Procesamiento</option>
                <option value="Empacado">Empacado</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="plantingDate">Fecha de Siembra</label>
              <input
                className="form-input"
                type="date"
                id="plantingDate"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="targetHumidity">Humedad Objetivo (%)</label>
              <input
                className="form-input"
                type="number"
                id="targetHumidity"
                value={targetHumidity}
                onChange={(e) => setTargetHumidity(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="targetTemp">Temp. Objetivo (°C)</label>
              <input
                className="form-input"
                type="number"
                id="targetTemp"
                value={targetTemp}
                onChange={(e) => setTargetTemp(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="btn btn-tertiary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Lote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
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
};
