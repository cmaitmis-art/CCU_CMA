import React, { useMemo, useState } from 'react';
import { createMC } from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';

function Field({ label, children, colSpan }) {
  return (
    <div className="form-group" style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

const initialFormState = () => ({
  // Filing Info
  new_file_no: '',
  old_file_no: '',
  reg_date: new Date().toISOString().slice(0, 10),
  
  // Section 1-3: Basic Info
  name: '',
  plan_no: '',
  address: '',
  email_address: '',
  
  // Section 4: Parcels
  residential_units: '',
  non_res_shops: '',
  non_res_office: '',
  non_res_hotel: '',

  // Section 5: Services Available
  services_lift: false,
  services_fire_agreement: false,
  services_generator_agreement: false,
  services_insurance: false,

  // Section 6: Facilities Available
  fac_common_parking: false,
  fac_accessory_car_parcel: false,
  fac_roof_top: false,
  fac_gym: false,
  fac_swimming_pool: false,
  fac_penth_house: false,
  fac_restaurant: false,
  fac_super_market: false,
  fac_garden: false,
  fac_sauna: false,
  fac_salon: false,
  fac_golf_tennis: false,
  fac_day_care: false,

  // Management Company
  mgmt_company_controlled: false,
  mgmt_company_name: '',
  mgmt_company_contact: '',

  // Personnel (Office Bearers)
  secretary: '',
  secretary_unit_no: '',
  secretary_contact: '',
  secretary_email: '',

  treasurer: '',
  treasurer_unit_no: '',
  treasurer_contact: '',
  treasurer_email: '',

  // Council Members (Table I - XII)
  council_members: Array.from({ length: 12 }, () => ({ name: '', unit_no: '', contact_no: '' })),

  // Section 7: Written Assurance
  written_assurance_fulfilled: false,
});

export default function RegistrationForm({ currentUser }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || 'Unknown';

  const [formData, setFormData] = useState(initialFormState());
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirmDialog();

  // Dynamic calculations
  const totalParcels = useMemo(() => {
    const res = parseInt(formData.residential_units) || 0;
    const shops = parseInt(formData.non_res_shops) || 0;
    const office = parseInt(formData.non_res_office) || 0;
    const hotel = parseInt(formData.non_res_hotel) || 0;
    return res + shops + office + hotel;
  }, [formData.residential_units, formData.non_res_shops, formData.non_res_office, formData.non_res_hotel]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCouncilMemberChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.council_members];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, council_members: updated };
    });
  };

  const handleClear = async () => {
    const confirmed = await confirm({
      title: 'Clear form',
      message: 'Are you sure you want to clear the form? All unsaved data will be lost.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    setFormData(initialFormState());
    showToast('Form cleared', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // Validations
    if (!formData.name.trim()) {
      showToast('Title name of the Management Corporation is required.', 'error');
      return;
    }
    if (!formData.written_assurance_fulfilled) {
      showToast('You must confirm the Written Assurance from the Secretary to proceed.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-generate file number if empty
      const finalFileNo = formData.new_file_no.trim() || `CMA/REG/${Date.now()}`;
      
      const shops = parseInt(formData.non_res_shops) || 0;
      const office = parseInt(formData.non_res_office) || 0;
      const hotel = parseInt(formData.non_res_hotel) || 0;
      const nonResUnits = shops + office + hotel;

      const payload = {
        ...formData,
        new_file_no: finalFileNo,
        file_no: finalFileNo,
        name: formData.name.trim(),
        management_corporation_name: formData.name.trim(),
        units: totalParcels,
        residential_units: parseInt(formData.residential_units) || null,
        non_residential_units: nonResUnits,
        // map compatibility columns
        residential: parseInt(formData.residential_units) || null,
        non_residential: nonResUnits,
        // serialize council members to string
        council_members: JSON.stringify(formData.council_members.filter(m => m.name.trim() !== '')),
        // New registrations always start as Pending until verified by CCU
        status: 'Pending',
        created_by: auditUserLabel,
        modified_by: auditUserLabel,
        user_name: auditUserLabel,
      };

      await createMC(payload);
      showToast('Application submitted and saved successfully! ✅');
      setFormData(initialFormState());
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to save application to the database.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cma-page">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            right: 22,
            zIndex: 2000,
            background: toast.type === 'success' ? '#f0fdf4' : toast.type === 'error' ? '#fef2f2' : '#eff6ff',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--navy)'}`,
            padding: '12px 14px',
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'times-circle' : 'info-circle'}`} 
             style={{ color: toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--navy)' }}></i>
          {toast.msg}
        </div>
      )}

      <style>
        {`
          /* ===== Step-by-step section system ===== */
          .reg-form-flow{counter-reset:reg-step;display:flex;flex-direction:column;gap:18px}

          .reg-section{
            position:relative;
            background:var(--card);
            border-radius:14px;
            padding:24px 26px 24px 30px;
            border:1px solid var(--border);
            box-shadow:0 1px 2px rgba(16,24,40,.04);
            counter-increment:reg-step;
          }
          .reg-section::before{
            content:"";
            position:absolute;
            left:0; top:14px; bottom:14px;
            width:4px;
            border-radius:0 4px 4px 0;
            background:linear-gradient(180deg,var(--navy) 0%,var(--navy2) 100%);
            opacity:.85;
          }
          .reg-section.no-step::before{ opacity:.35 }

          .reg-section-title{
            font-size:14.5px;
            font-weight:700;
            color:var(--navy);
            margin-bottom:18px;
            display:flex;
            align-items:center;
            gap:10px;
            padding-bottom:12px;
            border-bottom:1px dashed var(--border);
          }
          .reg-section-title .step-badge{
            flex:0 0 auto;
            width:24px; height:24px;
            border-radius:50%;
            background:var(--navy);
            color:#fff;
            font-size:11.5px;
            font-weight:700;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:inherit;
          }
          .reg-section-title .step-badge::after{
            content: counter(reg-step);
          }
          .reg-section-title i.fas{ color:var(--gold,#b8860b); font-size:13px }
          .reg-section-title .title-text{ flex:1 }
          .reg-section-title .optional-tag{
            font-size:10.5px;
            font-weight:600;
            text-transform:uppercase;
            letter-spacing:.5px;
            color:var(--text2);
            background:var(--bg);
            border:1px solid var(--border);
            padding:3px 8px;
            border-radius:20px;
          }

          .facility-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
          .checkbox-item{
            display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer;
            padding:11px 13px;border:1px solid var(--border);border-radius:9px;background:var(--bg);
            transition:background .15s,border-color .15s;
          }
          .checkbox-item:hover{background:#eef2f9;border-color:var(--navy2,var(--navy))}
          .checkbox-item input{cursor:pointer;accent-color:var(--navy);width:16px;height:16px;flex:0 0 auto}
          .checkbox-item:has(input:checked){
            background:#eef4ff;
            border-color:var(--navy);
            font-weight:600;
            color:var(--navy);
          }

          .page-header-banner{
            background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%);
            border-radius:14px;
            padding:22px 26px;
            margin-bottom:24px;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            flex-wrap:wrap;
          }
          .page-header-banner .title{font-family:'Playfair Display',serif;font-size:19px;color:#fff;line-height:1.3}
          .page-header-banner .sub{font-size:12px;color:rgba(255,255,255,.7);margin-top:4px;display:flex;align-items:center;gap:8px}
          .page-header-banner .sub .dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.5)}

          .reg-footer-actions{
            display:flex;gap:12px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;
            padding-top:20px;border-top:1px solid var(--border);
          }

          .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px 18px}
          .form-group .form-label{
            display:block;font-size:12.5px;font-weight:600;color:var(--text2);margin-bottom:6px;line-height:1.4;
          }

          .sub-section{
            border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--bg);margin-top:10px;
          }
          .sub-section-title{
            font-size:12px;font-weight:700;color:var(--navy);margin-bottom:12px;
            text-transform:uppercase;letter-spacing:.6px;
            display:flex;align-items:center;gap:6px;
          }

          .table-header-cell{padding:11px 10px;font-size:11px;font-weight:700;color:var(--navy);text-transform:uppercase;background:#f8fafc;border-bottom:2px solid var(--border);letter-spacing:.4px}
          .table-data-cell{padding:8px;border-bottom:1px solid var(--border)}

          @media (max-width:640px){
            .reg-section{padding:18px 16px 18px 22px}
            .page-header-banner{padding:18px}
          }
        `}
      </style>

      <div className="page-header-banner">
        <div>
          <div className="title">Application for Registration as a Management Corporation</div>
          <div className="sub">
            Condominium Management Authority<span className="dot"></span>CMA Registration Portal
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={handlePrint}>
            <i className="fas fa-print"></i> Print Form
          </button>
          <button className="btn btn-gold" onClick={handleSave} disabled={isSubmitting}>
            <i className="fas fa-save"></i> {isSubmitting ? 'Saving...' : 'Save & Submit'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="reg-form-flow">
        {/* Filing & System Information */}
        <div className="reg-section no-step">
          <div className="reg-section-title">
            <i className="fas fa-folder-open"></i>
            <span className="title-text">Filing Details (Office Use / System Reference)</span>
            <span className="optional-tag">Office Use</span>
          </div>
          <div className="form-grid">
            <Field label="Registration Date">
              <input 
                type="date" 
                className="form-control" 
                value={formData.reg_date} 
                onChange={(e) => handleInputChange('reg_date', e.target.value)} 
              />
            </Field>
            <Field label="New File No (Blank will auto-generate)">
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. CMA/CCU/2026/01" 
                value={formData.new_file_no}
                onChange={(e) => handleInputChange('new_file_no', e.target.value)}
              />
            </Field>
            <Field label="Old File No (Optional)">
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. MC/502" 
                value={formData.old_file_no}
                onChange={(e) => handleInputChange('old_file_no', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 1-3: Basic Details */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-building"></i>
            <span className="title-text">Management Corporation Identification</span>
          </div>
          <div className="form-grid">
            <Field label="1. Title Name of the Management Corporation *" colSpan={2}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter Title Name of the M/C" 
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Field>
            <Field label="2. Registered Condominium Plan No">
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. CP No. 1691" 
                value={formData.plan_no}
                onChange={(e) => handleInputChange('plan_no', e.target.value)}
              />
            </Field>
            <Field label="3. Official Address of the M/C" colSpan={3}>
              <textarea 
                className="form-control" 
                rows={2} 
                placeholder="Official Postal Address of the Management Corporation" 
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </Field>
            <Field label="Email Address">
              <input 
                type="email" 
                className="form-control" 
                placeholder="mc.email@domain.com" 
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 4: Parcels */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-th-large"></i>
            <span className="title-text">Number of Parcels in the Condominium Complex</span>
          </div>
          <div className="form-grid">
            <Field label="Residential Parcels">
              <input 
                type="number" 
                min="0"
                className="form-control" 
                placeholder="0" 
                value={formData.residential_units}
                onChange={(e) => handleInputChange('residential_units', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Shops">
              <input 
                type="number" 
                min="0"
                className="form-control" 
                placeholder="0" 
                value={formData.non_res_shops}
                onChange={(e) => handleInputChange('non_res_shops', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Office">
              <input 
                type="number" 
                min="0"
                className="form-control" 
                placeholder="0" 
                value={formData.non_res_office}
                onChange={(e) => handleInputChange('non_res_office', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Hotel">
              <input 
                type="number" 
                min="0"
                className="form-control" 
                placeholder="0" 
                value={formData.non_res_hotel}
                onChange={(e) => handleInputChange('non_res_hotel', e.target.value)}
              />
            </Field>
            <Field label="Total Calculated Parcels">
              <input 
                type="text" 
                className="form-control" 
                value={totalParcels} 
                disabled 
                style={{ background: 'var(--bg)', fontWeight: 'bold', color: 'var(--navy)' }} 
              />
            </Field>
          </div>
        </div>

        {/* Section 5: Services Available */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-concierge-bell"></i>
            <span className="title-text">Services Available</span>
          </div>
          <div className="facility-grid">
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={formData.services_lift} 
                onChange={(e) => handleInputChange('services_lift', e.target.checked)} 
              />
              Lift
            </label>
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={formData.services_fire_agreement} 
                onChange={(e) => handleInputChange('services_fire_agreement', e.target.checked)} 
              />
              Fire Service agreement
            </label>
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={formData.services_generator_agreement} 
                onChange={(e) => handleInputChange('services_generator_agreement', e.target.checked)} 
              />
              Generator Service agreement
            </label>
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={formData.services_insurance} 
                onChange={(e) => handleInputChange('services_insurance', e.target.checked)} 
              />
              Insurance Details
            </label>
          </div>
        </div>

        {/* Section 6: Facilities Available */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-swimming-pool"></i>
            <span className="title-text">Facilities Available</span>
          </div>
          <div className="facility-grid">
            {[
              { id: 'fac_common_parking', label: 'Common Parking' },
              { id: 'fac_accessory_car_parcel', label: 'Accessory Car Parcel' },
              { id: 'fac_roof_top', label: 'Roof Top' },
              { id: 'fac_gym', label: 'Gym' },
              { id: 'fac_swimming_pool', label: 'Swimming Pool' },
              { id: 'fac_penth_house', label: 'Penth House' },
              { id: 'fac_restaurant', label: 'Restaurant' },
              { id: 'fac_super_market', label: 'Super Market' },
              { id: 'fac_garden', label: 'Garden' },
              { id: 'fac_sauna', label: 'Sauna' },
              { id: 'fac_salon', label: 'Salon' },
              { id: 'fac_golf_tennis', label: 'Golf & Tennis Ground' },
              { id: 'fac_day_care', label: 'Day Care Centers' },
            ].map((facility) => (
              <label className="checkbox-item" key={facility.id}>
                <input 
                  type="checkbox" 
                  checked={formData[facility.id]} 
                  onChange={(e) => handleInputChange(facility.id, e.target.checked)} 
                />
                {facility.label}
              </label>
            ))}
          </div>
        </div>

        {/* Management Services Company Control */}
        <div className="reg-section no-step">
          <div className="reg-section-title">
            <i className="fas fa-handshake"></i>
            <span className="title-text">Management Services Company Control</span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Is the M/C controlled by a Management Company?</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="mgmt_company_controlled" 
                checked={formData.mgmt_company_controlled === true} 
                onChange={() => handleInputChange('mgmt_company_controlled', true)} 
              />
              Yes
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="mgmt_company_controlled" 
                checked={formData.mgmt_company_controlled === false} 
                onChange={() => handleInputChange('mgmt_company_controlled', false)} 
              />
              No
            </label>
          </div>

          {formData.mgmt_company_controlled && (
            <div className="sub-section">
              <div className="sub-section-title">Management Company Details</div>
              <div className="form-grid">
                <Field label="Name of the Company">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter company name" 
                    value={formData.mgmt_company_name}
                    onChange={(e) => handleInputChange('mgmt_company_name', e.target.value)}
                  />
                </Field>
                <Field label="Contact No">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter company contact number" 
                    value={formData.mgmt_company_contact}
                    onChange={(e) => handleInputChange('mgmt_company_contact', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Office Bearers Details */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-user-tie"></i>
            <span className="title-text">Names of the Office Bearers and their Contact Nos</span>
          </div>
          
          <div className="form-grid">
            {/* Secretary details */}
            <div className="sub-section" style={{ gridColumn: 'span 1' }}>
              <div className="sub-section-title">Secretary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Name">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Secretary full name" 
                    value={formData.secretary}
                    onChange={(e) => handleInputChange('secretary', e.target.value)}
                  />
                </Field>
                <Field label="Unit No">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Unit No" 
                    value={formData.secretary_unit_no}
                    onChange={(e) => handleInputChange('secretary_unit_no', e.target.value)}
                  />
                </Field>
                <Field label="Contact No">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Phone number" 
                    value={formData.secretary_contact}
                    onChange={(e) => handleInputChange('secretary_contact', e.target.value)}
                  />
                </Field>
                <Field label="E-mail Address">
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="email@domain.com" 
                    value={formData.secretary_email}
                    onChange={(e) => handleInputChange('secretary_email', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* Treasurer details */}
            <div className="sub-section" style={{ gridColumn: 'span 1' }}>
              <div className="sub-section-title">Treasurer</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Name">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Treasurer full name" 
                    value={formData.treasurer}
                    onChange={(e) => handleInputChange('treasurer', e.target.value)}
                  />
                </Field>
                <Field label="Unit No">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Unit No" 
                    value={formData.treasurer_unit_no}
                    onChange={(e) => handleInputChange('treasurer_unit_no', e.target.value)}
                  />
                </Field>
                <Field label="Contact No">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Phone number" 
                    value={formData.treasurer_contact}
                    onChange={(e) => handleInputChange('treasurer_contact', e.target.value)}
                  />
                </Field>
                <Field label="E-mail Address">
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="email@domain.com" 
                    value={formData.treasurer_email}
                    onChange={(e) => handleInputChange('treasurer_email', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Council Members Section */}
          <div className="sub-section" style={{ marginTop: '16px' }}>
            <div className="sub-section-title"><i className="fas fa-users"></i> Council Members (I - XII)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th className="table-header-cell" style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell" style={{ width: '160px' }}>Unit No</th>
                    <th className="table-header-cell" style={{ width: '200px' }}>Contact No</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.council_members.map((member, index) => (
                    <tr key={index}>
                      <td className="table-data-cell" style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text2)', background: '#fafafa' }}>
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][index]}
                      </td>
                      <td className="table-data-cell">
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder={`Council Member ${index + 1} Name`}
                          value={member.name}
                          onChange={(e) => handleCouncilMemberChange(index, 'name', e.target.value)}
                        />
                      </td>
                      <td className="table-data-cell">
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder="Unit No"
                          value={member.unit_no}
                          onChange={(e) => handleCouncilMemberChange(index, 'unit_no', e.target.value)}
                        />
                      </td>
                      <td className="table-data-cell">
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder="Contact No"
                          value={member.contact_no}
                          onChange={(e) => handleCouncilMemberChange(index, 'contact_no', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Written Assurance */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-signature"></i>
            <span className="title-text">Secretary Confirmation &amp; Assurance</span>
          </div>
          <div style={{ padding: '6px 0' }}>
            <label className="checkbox-item" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <input 
                type="checkbox" 
                checked={formData.written_assurance_fulfilled} 
                onChange={(e) => handleInputChange('written_assurance_fulfilled', e.target.checked)} 
                required
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                I hereby certify and provide written assurance that all requirements of the Condominium Management Authority (CMA) will be fulfilled in accordance with the regulations.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="reg-footer-actions">
          <button type="button" className="btn btn-outline" onClick={handleClear} disabled={isSubmitting}>
            <i className="fas fa-undo"></i> Clear Form
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrint} disabled={isSubmitting}>
            <i className="fas fa-print"></i> Print Application
          </button>
          <button type="submit" className="btn btn-gold" style={{ padding: '10px 24px', fontSize: '14px' }} disabled={isSubmitting}>
            <i className="fas fa-cloud-upload-alt"></i> {isSubmitting ? 'Submitting...' : 'Save & Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}