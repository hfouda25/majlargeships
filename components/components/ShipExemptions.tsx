import React, { useState } from "react";

type ReliefType = "Exemption" | "Extension";
type ReliefStatus = "Pending" | "Approved" | "Rejected" | "Expired";

type ExemptionRecord = {
  id: number;
  vesselName: string;
  imoNumber: string;
  type: ReliefType;
  description: string;
  validFrom: string; // YYYY-MM-DD
  validTo: string;   // YYYY-MM-DD
  status: ReliefStatus;
  remarks?: string;
};

const initialData: ExemptionRecord[] = [
  {
    id: 1,
    vesselName: "Caribbean Queen",
    imoNumber: "9876543",
    type: "Exemption",
    description:
      "Exemption from carriage of fast rescue boat due to limited service area around Jamaica.",
    validFrom: "2025-01-01",
    validTo: "2026-01-01",
    status: "Approved",
    remarks: "Subject to annual verification."
  },
  {
    id: 2,
    vesselName: "Kingston Star",
    imoNumber: "8765432",
    type: "Extension",
    description:
      "Dry dock / load line extension to allow voyage to approved yard.",
    validFrom: "2024-11-15",
    validTo: "2025-02-15",
    status: "Approved",
    remarks: "PSC to be informed if trading outside Caribbean."
  }
];

const ShipExemptions: React.FC = () => {
  const [records, setRecords] = useState<ExemptionRecord[]>(initialData);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<Omit<ExemptionRecord, "id">>({
    vesselName: "",
    imoNumber: "",
    type: "Exemption",
    description: "",
    validFrom: "",
    validTo: "",
    status: "Pending",
    remarks: ""
  });

  const resetForm = () => {
    setForm({
      vesselName: "",
      imoNumber: "",
      type: "Exemption",
      description: "",
      validFrom: "",
      validTo: "",
      status: "Pending",
      remarks: ""
    });
    setEditingId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vesselName || !form.imoNumber || !form.description) {
      alert("Vessel name, IMO number and description are required.");
      return;
    }

    if (editingId === null) {
      // add new
      const nextId = records.length === 0 ? 1 : Math.max(...records.map(r => r.id)) + 1;
      const newRecord: ExemptionRecord = { id: nextId, ...form };
      setRecords(prev => [newRecord, ...prev]);
    } else {
      // update existing
      setRecords(prev =>
        prev.map(r => (r.id === editingId ? { ...r, ...form } : r))
      );
    }

    resetForm();
  };

  const handleEdit = (rec: ExemptionRecord) => {
    setEditingId(rec.id);
    setForm({
      vesselName: rec.vesselName,
      imoNumber: rec.imoNumber,
      type: rec.type,
      description: rec.description,
      validFrom: rec.validFrom,
      validTo: rec.validTo,
      status: rec.status,
      remarks: rec.remarks ?? ""
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Delete this exemption/extension record?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Ship Exemptions &amp; Extensions</h2>
      <p style={{ opacity: 0.8 }}>
        Register and control exemptions and extensions granted to MAJ-registered vessels.
        This demo stores data locally in the browser (no backend connection).
      </p>

      {/* FORM */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 24,
          padding: 16,
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)"
        }}
      >
        <h3>{editingId === null ? "Add New Exemption / Extension" : "Edit Record"}</h3>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12
          }}
        >
          <label>
            Vessel Name *
            <input
              name="vesselName"
              value={form.vesselName}
              onChange={handleChange}
            />
          </label>
          <label>
            IMO Number *
            <input
              name="imoNumber"
              value={form.imoNumber}
              onChange={handleChange}
            />
          </label>
          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="Exemption">Exemption</option>
              <option value="Extension">Extension</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
          </label>
          <label>
            Valid From
            <input
              type="date"
              name="validFrom"
              value={form.validFrom}
              onChange={handleChange}
            />
          </label>
          <label>
            Valid To
            <input
              type="date"
              name="validTo"
              value={form.validTo}
              onChange={handleChange}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Description / Regulation reference *
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Remarks
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              rows={2}
            />
          </label>
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8
            }}
          >
            {editingId !== null && (
              <button type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
            <button type="submit">
              {editingId === null ? "Add Record" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.9rem"
        }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Vessel</th>
            <th>IMO</th>
            <th>Type</th>
            <th>Valid From</th>
            <th>Valid To</th>
            <th>Status</th>
            <th>Description (short)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={9}>No exemption / extension records yet.</td>
            </tr>
          ) : (
            records.map(rec => (
              <tr key={rec.id}>
                <td>{rec.id}</td>
                <td>{rec.vesselName}</td>
                <td>{rec.imoNumber}</td>
                <td>{rec.type}</td>
                <td>{rec.validFrom}</td>
                <td>{rec.validTo}</td>
                <td>{rec.status}</td>
                <td>{rec.description.slice(0, 40)}...</td>
                <td>
                  <button type="button" onClick={() => handleEdit(rec)}>
                    Edit
                  </button>{" "}
                  <button type="button" onClick={() => handleDelete(rec.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ShipExemptions;
