import React, { useState, useEffect } from 'react';

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  role: string;
  facility_id: string | null;
  facility_name?: string | null;
  is_active: number;
  created_at: string;
}

interface FacilityRecord {
  id: string;
  name: string;
  level: string;
}

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'anm',
    facility_id: '',
  });

  const loadData = async () => {
    try {
      const [uRes, fRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/facilities'),
      ]);
      const [uData, fData] = await Promise.all([uRes.json(), fRes.json()]);
      if (uData.success) setUsers(uData.users);
      if (fData.success) setFacilities(fData.facilities);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      await fetch(`/api/admin/users/${id}/toggle`, { method: 'PUT' });
      loadData();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ name: '', phone: '', role: 'anm', facility_id: '' });
        loadData();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      asha: 'ASHA (Village Level)',
      anm: 'ANM / CHO (Sub-centre)',
      phc_sn: 'PHC Staff Nurse',
      chc_sn: 'CHC Staff Nurse',
      dh_sn: 'DH Staff Nurse / Oncology',
      tert_sn: 'Tertiary Staff Nurse',
      phc_mo: 'PHC Medical Officer (MO)',
      dpo: 'District Programme Officer (DPO)',
      admin: 'System Administrator',
    };
    return map[role] || role.toUpperCase();
  };

  return (
    <div className="page-container">
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Frontline Healthcare Staff & Roles Roster ({users.length} Users)
          </div>
          <div className="panel-actions">
            <button id="btn-add-user" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              + Provision Staff Account
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Mobile Number (Login)</th>
                <th>Role Persona</th>
                <th>Assigned Facility</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {u.id}</div>
                  </td>
                  <td>
                    <code>{u.phone}</code>
                  </td>
                  <td>
                    <span className="badge badge-info">{getRoleLabel(u.role)}</span>
                  </td>
                  <td>{u.facility_name || 'All District Facilities'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleActive(u.id)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUser}>
              <div className="modal-header">
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Provision Frontline Staff User</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    id="input-user-name"
                    className="form-input"
                    required
                    placeholder="e.g. Suman Devi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Phone Number (OTP login) *</label>
                  <input
                    id="input-user-phone"
                    className="form-input"
                    required
                    placeholder="+919812345000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role Persona *</label>
                  <select
                    id="select-user-role"
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="asha">ASHA (Village Catchment)</option>
                    <option value="anm">ANM / CHO (Sub-centre Level)</option>
                    <option value="phc_sn">PHC Staff Nurse</option>
                    <option value="chc_sn">CHC Staff Nurse</option>
                    <option value="dh_sn">DH Staff Nurse / Oncology Coordinator</option>
                    <option value="tert_sn">Tertiary Staff Nurse</option>
                    <option value="phc_mo">PHC Medical Officer (Supervisory)</option>
                    <option value="dpo">District Programme Officer (DPO)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Facility</label>
                  <select
                    id="select-user-facility"
                    className="form-select"
                    value={formData.facility_id}
                    onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                  >
                    <option value="">-- No specific facility / District Level --</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.level})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button id="btn-submit-user" type="submit" className="btn btn-primary">Save Staff Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
