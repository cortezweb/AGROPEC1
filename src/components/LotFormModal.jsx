import React, { useState } from 'react';

export default function LotFormModal({ isOpen, onClose, onSave }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('Cupilapaca');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('Siembra');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().substring(0, 10));
  const [targetHumidity, setTargetHumidity] = useState('65');
  const [targetTemp, setTargetTemp] = useState('14');
  const [producer, setProducer] = useState('');
  const [community, setCommunity] = useState('');
  const [gps, setGps] = useState('');
  const [altitude, setAltitude] = useState('3820');
  const [soilType, setSoilType] = useState('Franco');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || !name || !area || !producer || !community || !gps) {
      alert('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    onSave({
      code,
      name,
      variety,
      area: parseFloat(area),
      status,
      plantingDate,
      targetHumidity: parseFloat(targetHumidity),
      targetTemp: parseFloat(targetTemp),
      currentHumidity: parseFloat(targetHumidity) - (Math.random() * 5),
      currentTemp: parseFloat(targetTemp) + (Math.random() * 2 - 1),
      producer,
      community,
      gps,
      altitude: parseFloat(altitude),
      soilType,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setCode('');
    setName('');
    setArea('');
    setStatus('Siembra');
    setProducer('');
    setCommunity('');
    setGps('');
    setAltitude('3820');
    setSoilType('Franco');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Registrar Nuevo Lote</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="code">Código Lote *</label>
              <input
                className="form-input"
                type="text"
                id="code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. LOT-C01"
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label" htmlFor="name">Nombre / Identificador *</label>
              <input
                className="form-input"
                type="text"
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Lote Canaviri Phuscani"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="producer">Productor *</label>
              <input
                className="form-input"
                type="text"
                id="producer"
                required
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="Ej. Mateo Quispe"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="community">Comunidad *</label>
              <input
                className="form-input"
                type="text"
                id="community"
                required
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="Ej. Comunidad Phuscani"
              />
            </div>
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
              <label className="form-label" htmlFor="gps">Coordenadas GPS *</label>
              <input
                className="form-input"
                type="text"
                id="gps"
                required
                value={gps}
                onChange={(e) => setGps(e.target.value)}
                placeholder="Ej. -16.1428, -69.2154"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="altitude">Altitud (msnm)</label>
              <input
                className="form-input"
                type="number"
                id="altitude"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                placeholder="Ej. 3820"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="soilType">Tipo de Suelo</label>
              <select
                className="form-input"
                id="soilType"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
              >
                <option value="Franco">Franco</option>
                <option value="Franco-Arcilloso">Franco-Arcilloso</option>
                <option value="Franco-Arenoso">Franco-Arenoso</option>
                <option value="Arcilloso">Arcilloso</option>
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

          <div className="form-group">
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
