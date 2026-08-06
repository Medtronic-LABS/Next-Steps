import { Icon } from '../components/Icon';
import { useApp } from '../data/store';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px', border: '1.5px solid var(--border-default)', borderRadius: 14,
  background: 'var(--surface-card)', fontSize: 15, color: 'var(--text-strong)', outline: 'none',
};

const ON = { background: 'var(--ml-peppermint)', color: '#1B6B47', borderColor: '#8FD3B2' };
const OFF = { background: 'var(--surface-card)', color: 'var(--text-body)', borderColor: 'var(--border-default)' };

export function Register() {
  const { reg, config, setReg, saveReg } = useApp();
  const r = reg ?? { name: '', phone: '', village: '', abha: '', status: 'normal' as const, consent: true };
  const ashaName = config.villages.find((v) => v.name === r.village)?.asha ?? '';
  const canSave = !!r.name.trim() && r.phone.replace(/\D/g, '').length >= 10 && !!r.village;

  const pairBtn = (active: boolean, label: string, on: boolean, onTap: () => void) => (
    <button
      onClick={onTap}
      style={{
        flex: 1, padding: '12px 8px', border: '1.5px solid', borderRadius: 13, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        ...(active ? ON : OFF),
      }}
    >
      {on && <Icon path="M20 6L9 17l-5-5" size={15} strokeWidth={3} />}
      {label}
    </button>
  );

  return (
    <>
      <div style={{ padding: '16px 16px 4px' }}>
        <h2 style={{ fontSize: 24, lineHeight: 1.12, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-strong)', margin: '0 0 5px' }}>Register a pregnant woman</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.45 }}>Name and mobile are required. No clinical details — ever.</p>

        <Field label="Full name" required>
          <input value={r.name} onChange={(e) => setReg({ name: e.target.value })} placeholder="Her full name" style={inputStyle} />
        </Field>

        <Field label="Mobile number" required>
          <input value={r.phone} onChange={(e) => setReg({ phone: e.target.value })} inputMode="numeric" placeholder="+91 10-digit mobile" style={inputStyle} />
        </Field>

        <div style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, minHeight: 22 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>Village <span style={{ color: 'var(--ml-merlot)' }}>*</span></span>
            {r.village ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', background: 'var(--surface-brand-soft)', color: 'var(--ml-blue)', borderRadius: 999, padding: '3px 10px 3px 7px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <Icon path="M5.5 20a6.5 6.5 0 0 1 13 0" size={13} strokeWidth={2} />
                ASHA · {ashaName}
              </span>
            ) : (
              <span style={{ flex: 'none', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ASHA resolves from village</span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={r.village}
              onChange={(e) => setReg({ village: e.target.value })}
              style={{ ...inputStyle, padding: '13px 38px 13px 14px', fontWeight: 500, appearance: 'none' }}
            >
              <option value="">Select village</option>
              {config.villages.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
            <Icon path="M6 9l6 6 6-6" size={18} stroke="var(--ml-ink-500)" strokeWidth={2} style={{ position: 'absolute', right: 13, top: '50%', marginTop: -9, pointerEvents: 'none' }} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
            Villages and their linked ASHA come from deployment configuration. Escalations route to the linked ASHA (NS-8) — she is never typed in.
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>
            ABHA / RCH ID <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span>
          </div>
          <input value={r.abha} onChange={(e) => setReg({ abha: e.target.value })} placeholder="—" style={inputStyle} />
        </div>

        <Group title="Pregnancy status" note="Routing label only — no reason, threshold or danger-sign detail is collected (NS-12).">
          {pairBtn(r.status === 'normal', 'Normal', r.status === 'normal', () => setReg({ status: 'normal' }))}
          {pairBtn(r.status === 'high', 'High risk', r.status === 'high', () => setReg({ status: 'high' }))}
        </Group>

        <Group title="WhatsApp reminders" note="Consent is required before any reminder is sent to her number.">
          {pairBtn(r.consent, 'Yes, consented', r.consent, () => setReg({ consent: true }))}
          {pairBtn(!r.consent, 'No', !r.consent, () => setReg({ consent: false }))}
        </Group>
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '12px 16px 22px', background: 'linear-gradient(to top, var(--surface-page) 74%, transparent)', zIndex: 30 }}>
        <button
          onClick={saveReg}
          style={{ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: 'var(--ml-blue)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: canSave ? 1 : 0.45, boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          <Icon path="M20 6L9 17l-5-5" size={18} strokeWidth={2.6} />Save &amp; open her journey
        </button>
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>
        {label} {required && <span style={{ color: 'var(--ml-merlot)' }}>*</span>}
      </div>
      {children}
    </div>
  );
}

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '13px 13px 14px', boxShadow: 'var(--shadow-xs)', marginBottom: 12 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', gap: 10 }}>{children}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 9, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
}
