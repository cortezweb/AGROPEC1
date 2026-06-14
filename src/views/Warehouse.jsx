import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'inventario', label: 'Inventario de Bodega' },
  { id: 'entrada', label: 'Guía de Entrada' },
  { id: 'salida', label: 'Guía de Salida' },
  { id: 'movimientos', label: 'Historial de Movimientos' },
  { id: 'facturas', label: 'Facturas y Pagos' },
  { id: 'almacen', label: 'Almacén de Granos (Silos)' }
];

const WAREHOUSES = ['Bodega Principal', 'Bodega Agroquímicos', 'Bodega Repuestos'];
const UNITS = ['Kg', 'Litros', 'Sacos (50kg)', 'Unidades', 'Galones'];

export default function Warehouse() {
  const [activeTab, setActiveTab] = useState('inventario');
  const [inventory, setInventory] = useState({});
  const [movements, setMovements] = useState({});
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Silo Storage State
  const [storage, setStorage] = useState({});
  const [selectedStorageId, setSelectedStorageId] = useState('');
  const [storageTemp, setStorageTemp] = useState('12.0');
  const [storageHum, setStorageHum] = useState('11.0');
  const [storageStock, setStorageStock] = useState('');
  const [submittingStorage, setSubmittingStorage] = useState(false);

  // Modal Traspaso State
  const [isTraspasoModalOpen, setIsTraspasoModalOpen] = useState(false);

  // Form states - Entrada
  const [entGuia, setEntGuia] = useState('');
  const [entProv, setEntProv] = useState('');
  const [entProdType, setEntProdType] = useState('existente'); // existente / nuevo
  const [entProdId, setEntProdId] = useState('');
  const [entNewProdName, setEntNewProdName] = useState('');
  const [entQty, setEntQty] = useState('');
  const [entUnit, setEntUnit] = useState('Kg');
  const [entWarehouse, setEntWarehouse] = useState(WAREHOUSES[0]);
  const [entDate, setEntDate] = useState(new Date().toISOString().substring(0, 10));
  const [entExpiration, setEntExpiration] = useState('');

  // Form states - Salida
  const [salDestino, setSalDestino] = useState('');
  const [salProdId, setSalProdId] = useState('');
  const [salQty, setSalQty] = useState('');
  const [salResp, setSalResp] = useState('');
  const [salDate, setSalDate] = useState(new Date().toISOString().substring(0, 10));

  // Form states - Traspaso Modal
  const [traspasoOrigen, setTraspasoOrigen] = useState(WAREHOUSES[0]);
  const [traspasoDestino, setTraspasoDestino] = useState(WAREHOUSES[1]);
  const [traspasoProdId, setTraspasoProdId] = useState('');
  const [traspasoQty, setTraspasoQty] = useState('');
  const [traspasoNum, setTraspasoNum] = useState('');

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setInventory(data.warehouse_inventory || {});
        setMovements(data.warehouse_movements || {});
        setInvoices(data.warehouse_invoices || {});
        setStorage(data.warehouse_storage || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Warehouse):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const invList = Object.values(inventory);
  const movList = Object.values(movements);
  const invoiceList = Object.values(invoices);

  // Set default product IDs for forms once inventory is loaded
  const storageList = Object.values(storage);
  useEffect(() => {
    if (invList.length > 0) {
      if (!entProdId) setEntProdId(invList[0].id);
      if (!salProdId) setSalProdId(invList[0].id);
      if (!traspasoProdId) setTraspasoProdId(invList[0].id);
    }
    if (storageList.length > 0 && !selectedStorageId) {
      setSelectedStorageId(storageList[0].id);
      setStorageStock(storageList[0].stock.toString());
      setStorageTemp(storageList[0].temperature.toString());
      setStorageHum(storageList[0].humidity.toString());
    }
  }, [inventory, storage]);

  const handleSaveStorage = (e) => {
    e.preventDefault();
    if (!selectedStorageId || !storageStock || !storageTemp || !storageHum) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }
    setSubmittingStorage(true);
    const storageRef = ref(db, `warehouse_storage/${selectedStorageId}`);
    update(storageRef, {
      stock: parseFloat(storageStock),
      temperature: parseFloat(storageTemp),
      humidity: parseFloat(storageHum),
      lastUpdate: new Date().toISOString()
    }).then(() => {
      alert("¡Depósito actualizado exitosamente!");
      setSubmittingStorage(false);
    }).catch(err => {
      console.error(err);
      alert("Error al actualizar depósito.");
      setSubmittingStorage(false);
    });
  };

  // Handle Guía de Entrada
  const handleSaveEntrada = (e) => {
    e.preventDefault();
    if (!entGuia || !entProv || !entQty) {
      alert("Complete todos los campos de la guía.");
      return;
    }

    const qtyVal = parseFloat(entQty);
    if (qtyVal <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    let targetProductId = entProdId;
    let productName = "";
    let productUnit = entUnit;
    let productExp = entExpiration || "2030-12-31"; // default far expiration

    if (entProdType === 'nuevo') {
      if (!entNewProdName) {
        alert("Escriba el nombre del nuevo producto.");
        return;
      }
      // Create new inventory item reference
      const invRef = ref(db, 'warehouse_inventory');
      const newInvRef = push(invRef);
      targetProductId = newInvRef.key;
      productName = entNewProdName;

      // Create new product record
      set(newInvRef, {
        id: targetProductId,
        product: productName,
        stock: qtyVal,
        unit: entUnit,
        warehouse: entWarehouse,
        expiration: productExp
      });
    } else {
      const existingItem = inventory[entProdId];
      if (!existingItem) {
        alert("Seleccione un producto válido.");
        return;
      }
      productName = existingItem.product;
      productUnit = existingItem.unit;
      productExp = existingItem.expiration || productExp;

      // Update existing item stock
      const itemRef = ref(db, `warehouse_inventory/${entProdId}`);
      update(itemRef, {
        stock: (existingItem.stock || 0) + qtyVal
      });
    }

    // Add entry log to movements
    const movementsRef = ref(db, 'warehouse_movements');
    const newMovRef = push(movementsRef);
    set(newMovRef, {
      id: newMovRef.key,
      date: entDate,
      type: 'Entrada',
      product: productName,
      qty: qtyVal,
      unit: productUnit,
      warehouse: entWarehouse,
      targetOrSource: `Proveedor: ${entProv} (Guía: ${entGuia})`,
      responsible: 'Operario Bodega'
    }).then(() => {
      alert("Guía de entrada registrada exitosamente.");
      setEntGuia('');
      setEntProv('');
      setEntQty('');
      setEntNewProdName('');
      setEntProdType('existente');
    }).catch(err => {
      console.error(err);
      alert("Error al registrar entrada.");
    });
  };

  // Handle Guía de Salida
  const handleSaveSalida = (e) => {
    e.preventDefault();
    if (!salDestino || !salQty || !salResp) {
      alert("Por favor complete todos los campos.");
      return;
    }

    const qtyVal = parseFloat(salQty);
    const selectedItem = inventory[salProdId];

    if (!selectedItem) {
      alert("Producto inválido.");
      return;
    }

    if (qtyVal <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    if (selectedItem.stock < qtyVal) {
      alert(`Stock insuficiente. Stock actual disponible: ${selectedItem.stock} ${selectedItem.unit}`);
      return;
    }

    // Deduct stock
    const itemRef = ref(db, `warehouse_inventory/${salProdId}`);
    update(itemRef, {
      stock: selectedItem.stock - qtyVal
    });

    // Record movement
    const movementsRef = ref(db, 'warehouse_movements');
    const newMovRef = push(movementsRef);
    set(newMovRef, {
      id: newMovRef.key,
      date: salDate,
      type: 'Salida',
      product: selectedItem.product,
      qty: qtyVal,
      unit: selectedItem.unit,
      warehouse: selectedItem.warehouse,
      targetOrSource: `Destino: ${salDestino}`,
      responsible: salResp
    }).then(() => {
      alert("Guía de salida registrada exitosamente.");
      setSalQty('');
      setSalDestino('');
      setSalResp('');
    }).catch(err => {
      console.error(err);
      alert("Error al registrar salida.");
    });
  };

  // Handle Traspaso entre Bodegas
  const handleSaveTraspaso = (e) => {
    e.preventDefault();
    if (traspasoOrigen === traspasoDestino) {
      alert("La bodega origen y destino no pueden ser iguales.");
      return;
    }

    const qtyVal = parseFloat(traspasoQty);
    if (qtyVal <= 0 || !traspasoNum) {
      alert("Complete los datos requeridos.");
      return;
    }

    // Find the item of the product in the source warehouse
    const sourceItem = invList.find(
      (item) => item.id === traspasoProdId && item.warehouse === traspasoOrigen
    );

    if (!sourceItem || sourceItem.stock < qtyVal) {
      alert(`Stock insuficiente en ${traspasoOrigen}. Stock disponible: ${sourceItem ? sourceItem.stock : 0}`);
      return;
    }

    // Check if target warehouse has this product already
    const targetItem = invList.find(
      (item) => item.product === sourceItem.product && item.warehouse === traspasoDestino
    );

    // Deduct from source
    const sourceRef = ref(db, `warehouse_inventory/${sourceItem.id}`);
    update(sourceRef, {
      stock: sourceItem.stock - qtyVal
    });

    // Add/Update target warehouse item
    if (targetItem) {
      const targetRef = ref(db, `warehouse_inventory/${targetItem.id}`);
      update(targetRef, {
        stock: (targetItem.stock || 0) + qtyVal
      });
    } else {
      const invRef = ref(db, 'warehouse_inventory');
      const newInvRef = push(invRef);
      set(newInvRef, {
        id: newInvRef.key,
        product: sourceItem.product,
        stock: qtyVal,
        unit: sourceItem.unit,
        warehouse: traspasoDestino,
        expiration: sourceItem.expiration || '2030-12-31'
      });
    }

    // Record both movements (Salida por Traspaso y Entrada por Traspaso)
    const movementsRef = ref(db, 'warehouse_movements');
    
    const movSalId = push(movementsRef).key;
    const movEntId = push(movementsRef).key;

    const todayStr = new Date().toISOString().substring(0, 10);

    set(ref(db, `warehouse_movements/${movSalId}`), {
      id: movSalId,
      date: todayStr,
      type: 'Traspaso (Salida)',
      product: sourceItem.product,
      qty: qtyVal,
      unit: sourceItem.unit,
      warehouse: traspasoOrigen,
      targetOrSource: `Traspaso N° ${traspasoNum} a ${traspasoDestino}`,
      responsible: 'Supervisor Bodega'
    });

    set(ref(db, `warehouse_movements/${movEntId}`), {
      id: movEntId,
      date: todayStr,
      type: 'Traspaso (Entrada)',
      product: sourceItem.product,
      qty: qtyVal,
      unit: sourceItem.unit,
      warehouse: traspasoDestino,
      targetOrSource: `Traspaso N° ${traspasoNum} desde ${traspasoOrigen}`,
      responsible: 'Supervisor Bodega'
    }).then(() => {
      alert(`¡Traspaso N° ${traspasoNum} realizado con éxito!`);
      setIsTraspasoModalOpen(false);
      setTraspasoQty('');
      setTraspasoNum('');
    }).catch(err => {
      console.error(err);
      alert("Error al realizar el traspaso.");
    });
  };

  // Handle Invoice Pay State
  const handlePayInvoice = (id) => {
    const invRef = ref(db, `warehouse_invoices/${id}`);
    update(invRef, {
      status: 'Pagado'
    }).then(() => {
      alert("¡Factura marcada como pagada!");
    }).catch(err => console.error(err));
  };

  // Expiration Warning computations
  const getExpirationWarnings = () => {
    const today = new Date();
    return invList.filter(item => {
      if (!item.expiration) return false;
      const expDate = new Date(item.expiration);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && item.stock > 0;
    });
  };

  const expWarnings = getExpirationWarnings();

  return (
    <div>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Módulo de Bodegas y Stock</h1>
          <p style={styles.subtitle} className="view-subtitle">Gestión integral de inventario en tiempo real, movimientos, traspasos y control de pagos</p>
        </div>
        <button onClick={() => setIsTraspasoModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          📦 Registrar Traspaso
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Expiration warning banner */}
      {!loading && expWarnings.length > 0 && (
        <div style={styles.expirationAlert}>
          <h4 style={{ margin: 0, color: '#93000a' }}>⚠️ Alerta de Vencimiento de Productos</h4>
          <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            Los siguientes insumos almacenados están próximos a vencer o ya han caducado. Se recomienda rotar stock prioritariamente:
          </p>
          <ul style={{ fontSize: '13px', marginTop: '8px', paddingLeft: '20px' }}>
            {expWarnings.map(item => {
              const expDate = new Date(item.expiration);
              const diffDays = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
              const isExpired = diffDays < 0;

              return (
                <li key={item.id} style={{ marginBottom: '4px' }}>
                  <strong>{item.product}</strong> en <code>{item.warehouse}</code>: 
                  Stock: <code>{item.stock} {item.unit}</code> • Vence: <span style={{ fontWeight: 600, color: isExpired ? '#ba1a1a' : '#735c00' }}>
                    {item.expiration} ({isExpired ? 'Vencido hace ' + Math.abs(diffDays) + ' días' : 'Vence en ' + diffDays + ' días'})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabsContainer} className="view-tabs-container">
        <div className="view-tabs">
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
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Cargando existencias de bodega...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: INVENTARIO */}
          {activeTab === 'inventario' && (
            <div>
              <h3 style={styles.sectionTitle}>Existencias Totales en Almacén</h3>
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Producto</th>
                        <th style={styles.th}>Bodega Almacén</th>
                        <th style={styles.th}>Stock Disponible</th>
                        <th style={styles.th}>Unidad</th>
                        <th style={styles.th}>Fecha Vencimiento</th>
                        <th style={styles.th}>Estado Rotación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay productos en inventario.
                          </td>
                        </tr>
                      ) : (
                        invList.map(item => {
                          const expDate = new Date(item.expiration);
                          const diffDays = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                          const isAlert = diffDays <= 30 && item.stock > 0;

                          return (
                            <tr key={item.id} style={styles.tableRowBody}>
                              <td style={{ ...styles.td, fontWeight: 600 }}>{item.product}</td>
                              <td style={styles.td}>{item.warehouse}</td>
                              <td style={{ ...styles.td, fontWeight: 700, color: item.stock > 10 ? 'var(--tertiary)' : 'var(--primary)' }}>
                                {item.stock}
                              </td>
                              <td style={styles.td}>{item.unit}</td>
                              <td style={styles.td}>{item.expiration || 'N/A'}</td>
                              <td style={styles.td}>
                                <span className={`badge ${
                                  isAlert ? 'badge-siembra' : item.stock === 0 ? 'badge-procesamiento' : 'badge-cosecha'
                                }`}>
                                  {isAlert ? 'Vencimiento Cercano' : item.stock === 0 ? 'Sin Stock' : 'Estable'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUÍA DE ENTRADA */}
          {activeTab === 'entrada' && (
            <div style={styles.formSplitGrid} className="view-form-split-grid">
              <div style={{ flex: 1.2 }}>
                <h3 style={styles.sectionTitle}>Registrar Guía de Ingreso</h3>
                <div className="card" style={{ padding: '24px' }}>
                  <form onSubmit={handleSaveEntrada}>
                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entGuia">N° Guía de Entrada</label>
                        <input
                          className="form-input"
                          type="text"
                          id="entGuia"
                          required
                          placeholder="Ej. G-84930"
                          value={entGuia}
                          onChange={(e) => setEntGuia(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entProv">Proveedor Emisor</label>
                        <input
                          className="form-input"
                          type="text"
                          id="entProv"
                          required
                          placeholder="Ej. Corporación Semillas"
                          value={entProv}
                          onChange={(e) => setEntProv(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tipo de Producto</label>
                      <div style={{ display: 'flex', gap: '20px', margin: '8px 0 12px 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="radio"
                            name="entProdType"
                            value="existente"
                            checked={entProdType === 'existente'}
                            onChange={() => setEntProdType('existente')}
                          />
                          Producto Existente en Catálogo
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="radio"
                            name="entProdType"
                            value="nuevo"
                            checked={entProdType === 'nuevo'}
                            onChange={() => setEntProdType('nuevo')}
                          />
                          Nuevo Insumo / Producto
                        </label>
                      </div>
                    </div>

                    {entProdType === 'existente' ? (
                      <div className="form-group">
                        <label className="form-label" htmlFor="entProdSelect">Seleccione Producto</label>
                        <select
                          className="form-input"
                          id="entProdSelect"
                          value={entProdId}
                          onChange={(e) => setEntProdId(e.target.value)}
                        >
                          {invList.map(item => (
                            <option key={item.id} value={item.id}>{item.product} ({item.warehouse})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={styles.row} className="view-form-row">
                        <div className="form-group" style={{ flex: 1.5 }}>
                          <label className="form-label" htmlFor="entNewName">Nombre del Nuevo Producto</label>
                          <input
                            className="form-input"
                            type="text"
                            id="entNewName"
                            required
                            placeholder="Ej. Palas de repuesto, Fertilizante Nitrógeno"
                            value={entNewProdName}
                            onChange={(e) => setEntNewProdName(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label" htmlFor="entNewUnit">Unidad Medida</label>
                          <select
                            className="form-input"
                            id="entNewUnit"
                            value={entUnit}
                            onChange={(e) => setEntUnit(e.target.value)}
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entQty">Cantidad a Ingresar</label>
                        <input
                          className="form-input"
                          type="number"
                          id="entQty"
                          required
                          placeholder="Ej. 50"
                          value={entQty}
                          onChange={(e) => setEntQty(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entWarehouse">Bodega Destino</label>
                        <select
                          className="form-input"
                          id="entWarehouse"
                          value={entWarehouse}
                          onChange={(e) => setEntWarehouse(e.target.value)}
                        >
                          {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entDate">Fecha Ingreso</label>
                        <input
                          className="form-input"
                          type="date"
                          id="entDate"
                          value={entDate}
                          onChange={(e) => setEntDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="entExp">Fecha Vencimiento (Opcional)</label>
                        <input
                          className="form-input"
                          type="date"
                          id="entExp"
                          value={entExpiration}
                          onChange={(e) => setEntExpiration(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                      Registrar Entrada de Materiales
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ flex: 1 }} className="view-guide-panel">
                <h3 style={styles.sectionTitle}>Distribución y Zonas</h3>
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--tertiary-container)', border: '1px solid var(--tertiary)' }}>
                  <h4 style={{ ...styles.cardTitle, color: 'var(--tertiary-dark)' }}>Ubicación de Materiales</h4>
                  <p style={{ fontSize: '13px', lineHeight: '1.5', margin: '8px 0 16px 0', color: 'var(--text-muted)' }}>
                    Para optimizar la rotación y seguridad de los recursos de la Granja Canaviri, utiliza la siguiente distribución espacial de bodegas:
                  </p>
                  <ul style={styles.warehouseList}>
                    <li><strong>Bodega Principal:</strong> Semillas de Cañihua, Pop, Grano procesado y sacos limpios de envasado.</li>
                    <li><strong>Bodega Agroquímicos:</strong> Bioestimulantes, abonos orgánicos, fertilizantes y plaguicidas autorizados.</li>
                    <li><strong>Bodega Repuestos:</strong> Herramientas mecánicas, aceites hidráulicos, filtros y piezas de repuestos de tractores y cosechadoras.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUÍA DE SALIDA */}
          {activeTab === 'salida' && (
            <div style={styles.formSplitGrid} className="view-form-split-grid">
              <div style={{ flex: 1.2 }}>
                <h3 style={styles.sectionTitle}>Registrar Despacho de Materiales</h3>
                <div className="card" style={{ padding: '24px' }}>
                  <form onSubmit={handleSaveSalida}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="salProd">Producto a Despachar</label>
                      <select
                        className="form-input"
                        id="salProd"
                        value={salProdId}
                        onChange={(e) => setSalProdId(e.target.value)}
                      >
                        {invList.filter(item => item.stock > 0).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.product} (Disponible: {item.stock} {item.unit} en {item.warehouse})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="salQty">Cantidad a Despachar</label>
                        <input
                          className="form-input"
                          type="number"
                          id="salQty"
                          required
                          placeholder="Ej. 10"
                          value={salQty}
                          onChange={(e) => setSalQty(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="salDest">Destino (Cuartel / Máquina)</label>
                        <input
                          className="form-input"
                          type="text"
                          id="salDest"
                          required
                          placeholder="Ej. Cuartel A-1 / Tractor JD"
                          value={salDestino}
                          onChange={(e) => setSalDestino(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="salResp">Responsable del Retiro</label>
                        <input
                          className="form-input"
                          type="text"
                          id="salResp"
                          required
                          placeholder="Ej. Hamilton Canaviri"
                          value={salResp}
                          onChange={(e) => setSalResp(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="salDate">Fecha Despacho</label>
                        <input
                          className="form-input"
                          type="date"
                          id="salDate"
                          value={salDate}
                          onChange={(e) => setSalDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                      Registrar Salida de Materiales
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ flex: 1 }} className="view-guide-panel">
                <h3 style={styles.sectionTitle}>Reglas de Salida</h3>
                <div className="card" style={{ padding: '24px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}>
                  <h4 style={{ ...styles.cardTitle, color: '#d46b08' }}>Validación de Stock Obligatoria</h4>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', margin: '8px 0 0 0', color: 'var(--text-muted)' }}>
                    El sistema impide egresar insumos si la cantidad despachada supera las existencias físicas registradas en la bodega correspondiente.
                    Todo despacho debe estar asignado a una persona responsable e individualizar el Cuartel o la Máquina agrícola de destino.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORIAL DE MOVIMIENTOS */}
          {activeTab === 'movimientos' && (
            <div>
              <h3 style={styles.sectionTitle}>Historial de Movimientos de Almacén</h3>
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Tipo Movimiento</th>
                        <th style={styles.th}>Producto</th>
                        <th style={styles.th}>Cantidad</th>
                        <th style={styles.th}>Bodega</th>
                        <th style={styles.th}>Origen / Destino</th>
                        <th style={styles.th}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se han registrado movimientos de inventario.
                          </td>
                        </tr>
                      ) : (
                        movList.reverse().map(mov => (
                          <tr key={mov.id} style={styles.tableRowBody}>
                            <td style={styles.td}>{mov.date}</td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                mov.type.includes('Entrada') ? 'badge-cosecha' : mov.type.includes('Salida') ? 'badge-siembra' : 'badge-procesamiento'
                              }`}>
                                {mov.type}
                              </span>
                            </td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{mov.product}</td>
                            <td style={styles.td}>{mov.qty} {mov.unit}</td>
                            <td style={styles.td}>{mov.warehouse}</td>
                            <td style={styles.td}>{mov.targetOrSource}</td>
                            <td style={styles.td}>{mov.responsible}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FACTURAS */}
          {activeTab === 'facturas' && (
            <div>
              <h3 style={styles.sectionTitle}>Comprobantes y Facturas por Pagar</h3>
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>N° Factura</th>
                        <th style={styles.th}>Proveedor</th>
                        <th style={styles.th}>Monto Total</th>
                        <th style={styles.th}>Fecha Emisión</th>
                        <th style={styles.th}>Estado de Pago</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay facturas de compras cargadas.
                          </td>
                        </tr>
                      ) : (
                        invoiceList.reverse().map(fact => (
                          <tr key={fact.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{fact.invoiceNumber}</td>
                            <td style={styles.td}>{fact.provider}</td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>${fact.amount.toFixed(2)}</td>
                            <td style={styles.td}>{fact.date}</td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                fact.status === 'Pagado' ? 'badge-cosecha' : 'badge-siembra'
                              }`}>
                                {fact.status}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {fact.status === 'Pendiente' ? (
                                <button
                                  onClick={() => handlePayInvoice(fact.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Registrar Pago
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pagado ✓</span>
                              )}
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

          {/* TAB 6: ALMACEN DE GRANOS (SILOS) */}
          {activeTab === 'almacen' && (
            <div>
              {/* KPIs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stock Grano Comercial</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                    {storageList.filter(s => s.type === 'Grano comercial').reduce((sum, s) => sum + (s.stock || 0), 0).toLocaleString()} kg
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Destinado a ventas B2B</span>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stock Semilla Reservada</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                    {storageList.filter(s => s.type === 'Semilla').reduce((sum, s) => sum + (s.stock || 0), 0).toLocaleString()} kg
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Reservas para próximas siembras</span>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Temperatura Media Silos</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                    {storageList.length > 0 ? (storageList.reduce((sum, s) => sum + (s.temperature || 0), 0) / storageList.length).toFixed(1) : 0}°C
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Temperatura promedio de granos</span>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Humedad Media Silos</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                    {storageList.length > 0 ? (storageList.reduce((sum, s) => sum + (s.humidity || 0), 0) / storageList.length).toFixed(1) : 0}%
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Humedad promedio de granos</span>
                </div>
              </div>

              {/* Form Split */}
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1.5, minWidth: '300px' }}>
                  <h3 style={styles.sectionTitle}>Silos y Depósitos de Almacenamiento</h3>
                  <div className="card">
                    <div style={styles.tableContainer} className="view-table-container">
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableRowHead}>
                            <th style={styles.th}>ID / Silo</th>
                            <th style={styles.th}>Tipo Contenido</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Stock Actual</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Temperatura (°C)</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Humedad (%)</th>
                            <th style={styles.th}>Última Medición</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storageList.map(st => (
                            <tr key={st.id} style={styles.tableRowBody}>
                              <td style={{ ...styles.td, fontWeight: 600 }}>{st.name}</td>
                              <td style={styles.td}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: st.type === 'Semilla' ? 'var(--primary-light)' : 'var(--tertiary-container)',
                                  color: st.type === 'Semilla' ? 'var(--primary)' : 'var(--tertiary-dark)'
                                }}>
                                  {st.type}
                                </span>
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{(st.stock || 0).toLocaleString()} kg</td>
                              <td style={{
                                ...styles.td,
                                textAlign: 'right',
                                fontWeight: 500,
                                color: st.temperature > 15 ? 'var(--error)' : 'var(--text-primary)'
                              }}>{(st.temperature || 0).toFixed(1)}°C</td>
                              <td style={{
                                ...styles.td,
                                textAlign: 'right',
                                fontWeight: 500,
                                color: st.humidity > 13 ? 'var(--error)' : 'var(--text-primary)'
                              }}>{(st.humidity || 0).toFixed(1)}%</td>
                              <td style={styles.td}>{st.lastUpdate ? new Date(st.lastUpdate).toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  minWidth: '280px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--outline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px'
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 16px 0' }}>Actualizar Sensores del Silo</h3>
                  {storageList.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargue silos semilla en Firebase para operar.</p>
                  ) : (
                    <form onSubmit={handleSaveStorage} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>Seleccionar Silo *</label>
                        <select
                          value={selectedStorageId}
                          onChange={(e) => {
                            setSelectedStorageId(e.target.value);
                            const siloObj = storage[e.target.value];
                            if (siloObj) {
                              setStorageStock(siloObj.stock.toString());
                              setStorageTemp(siloObj.temperature.toString());
                              setStorageHum(siloObj.humidity.toString());
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '13.5px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--outline)',
                            outline: 'none',
                            backgroundColor: '#ffffff',
                            height: '40px',
                          }}
                          required
                        >
                          {storageList.map(st => (
                            <option key={st.id} value={st.id}>{st.name} ({st.type})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>Stock Físico ($kg$) *</label>
                        <input
                          type="number"
                          value={storageStock}
                          onChange={(e) => setStorageStock(e.target.value)}
                          placeholder="Ej: 4800"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '13.5px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--outline)',
                            outline: 'none',
                            backgroundColor: '#ffffff',
                          }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>Temp (°C) *</label>
                          <input
                            type="number"
                            step="0.1"
                            value={storageTemp}
                            onChange={(e) => setStorageTemp(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              fontSize: '13.5px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--outline)',
                              outline: 'none',
                              backgroundColor: '#ffffff',
                            }}
                            required
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>Humedad (%) *</label>
                          <input
                            type="number"
                            step="0.1"
                            value={storageHum}
                            onChange={(e) => setStorageHum(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              fontSize: '13.5px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--outline)',
                              outline: 'none',
                              backgroundColor: '#ffffff',
                            }}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingStorage}>
                          {submittingStorage ? 'Actualizando...' : 'Guardar Lecturas de Sensores'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRASPASO MODAL */}
      {isTraspasoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Traspaso entre Bodegas</h3>
              <button onClick={() => setIsTraspasoModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSaveTraspaso}>
              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="traspOrigen">Bodega de Origen</label>
                  <select
                    className="form-input"
                    id="traspOrigen"
                    value={traspasoOrigen}
                    onChange={(e) => setTraspasoOrigen(e.target.value)}
                  >
                    {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="traspDest">Bodega de Destino</label>
                  <select
                    className="form-input"
                    id="traspDest"
                    value={traspasoDestino}
                    onChange={(e) => setTraspasoDestino(e.target.value)}
                  >
                    {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="traspProd">Producto a Traspasar</label>
                <select
                  className="form-input"
                  id="traspProd"
                  value={traspasoProdId}
                  onChange={(e) => setTraspasoProdId(e.target.value)}
                >
                  {invList
                    .filter(item => item.warehouse === traspasoOrigen && item.stock > 0)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.product} (Disponible: {item.stock} {item.unit})
                      </option>
                    ))}
                  {invList.filter(item => item.warehouse === traspasoOrigen && item.stock > 0).length === 0 && (
                    <option value="">No hay productos con stock en {traspasoOrigen}</option>
                  )}
                </select>
              </div>

              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="traspQty">Cantidad a Mover</label>
                  <input
                    className="form-input"
                    type="number"
                    id="traspQty"
                    required
                    placeholder="Ej. 10"
                    value={traspasoQty}
                    onChange={(e) => setTraspasoQty(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="traspNum">N° de Guía Traspaso</label>
                  <input
                    className="form-input"
                    type="text"
                    id="traspNum"
                    required
                    placeholder="Ej. T-4830"
                    value={traspasoNum}
                    onChange={(e) => setTraspasoNum(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsTraspasoModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Traspaso
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
  expirationAlert: {
    padding: '16px 20px',
    backgroundColor: '#fff1f0',
    border: '1px solid #ffa39e',
    borderRadius: 'var(--radius-lg)',
    marginBottom: '32px',
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
  },
  warehouseList: {
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
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  }
};
