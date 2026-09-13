import React, { useState, useEffect } from 'react';

interface Facility {
  id: string;
  name: string;
  short_name: string;
  level: string;
  nin_code: string;
  block: string;
  district: string;
  services: string;
}

interface Village {
  id: string;
  name: string;
  subcentre_id: string;
  subcentre_name?: string;
  asha_name: string;
  asha_phone: string;
  block?: string;
  district?: string;
}

export const CatchmentView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'villages' | 'facilities'>('villages');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch('/api/admin/facilities'),
        fetch('/api/admin/villages'),
      ]);
      const [fData, vData] = await Promise.all([fRes.json(), vRes.json()]);
      if (fData.success) setFacilities(fData.facilities);
      if (vData.success) setVillages(vData.villages);
    } catch (err) {
      console.error('Failed to load catchment data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadMessage(null);

    try {
      const res = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadMessage(`✅ Successfully onboarded ${data.processedRecords} villages & ASHA linkages from ${file.name}`);
        loadData();
      } else {
        setUploadMessage(`❌ Upload error: ${data.error}`);
      }
    } catch (err: any) {
      setUploadMessage(`❌ Network error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = 'Village Name,ASHA Name,ASHA Phone,Subcentre ID\n' +
      'Bhanpur,ASHA Radha,+919812345006,FAC-SC-GHU\n' +
      'Dihiya,ASHA Sunita,+919812345007,FAC-SC-GHU\n' +
      'Katra,ASHA Meera,+919812345008,FAC-SC-SIR\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_pilot_villages.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      {/* Sub-tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          id="subtab-villages"
          className={`btn btn-sm ${activeSubTab === 'villages' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('villages')}
        >
          Village-to-ASHA Catchment Mapping ({villages.length})
        </button>
        <button
          id="subtab-facilities"
          className={`btn btn-sm ${activeSubTab === 'facilities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('facilities')}
        >
          Facility Ladder & Hierarchy ({facilities.length})
        </button>
      </div>

      {uploadMessage && (
        <div style={{ padding: '12px 18px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}>
          {uploadMessage}
        </div>
      )}

      {activeSubTab === 'villages' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Configured Village Roster & Linked ASHA (Guardrail G5)
            </div>

            <div className="panel-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadSampleCsv}>
                ⬇ Sample CSV Template
              </button>

              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                {uploading ? 'Processing...' : '📁 Bulk CSV Onboarding'}
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Village Name</th>
                  <th>Linked ASHA (Auto-resolved)</th>
                  <th>ASHA Contact</th>
                  <th>Parent Sub-centre (AAM)</th>
                  <th>Block</th>
                  <th>District</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {v.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{v.asha_name}</span>
                    </td>
                    <td>
                      <code>{v.asha_phone}</code>
                    </td>
                    <td>{v.subcentre_name || v.subcentre_id}</td>
                    <td>{v.block || 'Sirmour'}</td>
                    <td>{v.district || 'Rewa'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'facilities' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              Rewa Health Facility Network (5-Tier Ladder)
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Level of Care</th>
                  <th>National NIN Code</th>
                  <th>Block / Sector</th>
                  <th>District</th>
                  <th>Configured Services</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => {
                  let servicesList: string[] = [];
                  try {
                    servicesList = JSON.parse(f.services || '[]');
                  } catch {
                    servicesList = [];
                  }

                  return (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {f.id}</div>
                      </td>
                      <td>
                        <span className={`badge ${f.level === 'SUBCENTRE' ? 'badge-success' : f.level === 'PHC' ? 'badge-info' : 'badge-warning'}`}>
                          {f.level}
                        </span>
                      </td>
                      <td>
                        <code>{f.nin_code}</code>
                      </td>
                      <td>{f.block}</td>
                      <td>{f.district}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {servicesList.map((s) => (
                            <span key={s} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
