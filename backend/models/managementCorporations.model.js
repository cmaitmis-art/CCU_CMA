module.exports = (sequelize, DataTypes) => {
  const ManagementCorporation = sequelize.define(
    'ManagementCorporation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      file_no: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      plan_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      units: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      residential_units: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      non_residential_units: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      non_res_shops: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      non_res_office: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      non_res_hotel: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      council_members: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      secretary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reg_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      old_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      new_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      management_corporation_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      residential: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      non_residential: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      service_units: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      renewal_period: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      next_agm_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      renewal_date_vise: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_date_vise: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mc: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      engineer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ma: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      secretary_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_minutes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attendance: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      audited_accounts: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      final_accounts: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      building_insurance: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sinking_fund: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      budget_proposal: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      town: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      municipal_council_pradeshiya_saba: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      certificate_division_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      land_registry_approved_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      declaration_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      email_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'Active',
      },
      created_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      modified_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      history: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // RegistrationForm.jsx fields (optional)
      services_lift: { type: DataTypes.TEXT, allowNull: true },
      services_fire_agreement: { type: DataTypes.TEXT, allowNull: true },
      services_generator_agreement: { type: DataTypes.TEXT, allowNull: true },
      services_insurance: { type: DataTypes.TEXT, allowNull: true },

      fac_common_parking: { type: DataTypes.TEXT, allowNull: true },
      fac_accessory_car_parcel: { type: DataTypes.TEXT, allowNull: true },
      fac_roof_top: { type: DataTypes.TEXT, allowNull: true },
      fac_gym: { type: DataTypes.TEXT, allowNull: true },
      fac_swimming_pool: { type: DataTypes.TEXT, allowNull: true },
      fac_penth_house: { type: DataTypes.TEXT, allowNull: true },
      fac_restaurant: { type: DataTypes.TEXT, allowNull: true },
      fac_super_market: { type: DataTypes.TEXT, allowNull: true },
      fac_garden: { type: DataTypes.TEXT, allowNull: true },
      fac_sauna: { type: DataTypes.TEXT, allowNull: true },
      fac_salon: { type: DataTypes.TEXT, allowNull: true },
      fac_golf_tennis: { type: DataTypes.TEXT, allowNull: true },
      fac_day_care: { type: DataTypes.TEXT, allowNull: true },

      mgmt_company_controlled: { type: DataTypes.TEXT, allowNull: true },
      mgmt_company_name: { type: DataTypes.TEXT, allowNull: true },
      mgmt_company_contact: { type: DataTypes.TEXT, allowNull: true },

      secretary_contact: { type: DataTypes.TEXT, allowNull: true },
      secretary_email: { type: DataTypes.TEXT, allowNull: true },
      treasurer_contact: { type: DataTypes.TEXT, allowNull: true },
      treasurer_email: { type: DataTypes.TEXT, allowNull: true },
      written_assurance_fulfilled: { type: DataTypes.TEXT, allowNull: true },

      // Checklist fields (MCManagement.jsx)
      approval_note: { type: DataTypes.TEXT, allowNull: true },

      cl_reg_condo_plan: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_total: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_residential: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_office: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_shops: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_hotels: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_service: { type: DataTypes.TEXT, allowNull: true },

      cl_services_facilities: { type: DataTypes.TEXT, allowNull: true },
      cl_written_assurance: { type: DataTypes.TEXT, allowNull: true },

      cl_photocopy_condo_plan: { type: DataTypes.TEXT, allowNull: true },
      cl_photocopy_condo_plan_date: { type: DataTypes.TEXT, allowNull: true },

      cl_cma_certificate: { type: DataTypes.TEXT, allowNull: true },
      cl_cma_certificate_no: { type: DataTypes.TEXT, allowNull: true },
      cl_cma_certificate_date: { type: DataTypes.TEXT, allowNull: true },

      cl_declaration: { type: DataTypes.TEXT, allowNull: true },
      cl_declaration_no: { type: DataTypes.TEXT, allowNull: true },
      cl_declaration_date: { type: DataTypes.TEXT, allowNull: true },

      cl_agm_minutes: { type: DataTypes.TEXT, allowNull: true },
      cl_agm_minutes_date: { type: DataTypes.TEXT, allowNull: true },

      cl_attendance: { type: DataTypes.TEXT, allowNull: true },
      cl_attendance_total: { type: DataTypes.TEXT, allowNull: true },
      cl_attendance_physically: { type: DataTypes.TEXT, allowNull: true },
      cl_attendance_proxy: { type: DataTypes.TEXT, allowNull: true },

      cl_insurance: { type: DataTypes.TEXT, allowNull: true },
      cl_insurance_from: { type: DataTypes.TEXT, allowNull: true },
      cl_insurance_to: { type: DataTypes.TEXT, allowNull: true },

      cl_owners_list: { type: DataTypes.TEXT, allowNull: true },
      cl_constitution: { type: DataTypes.TEXT, allowNull: true },
      cl_bylaws: { type: DataTypes.TEXT, allowNull: true },
      cl_additional_bylaws: { type: DataTypes.TEXT, allowNull: true },

      cl_checked_by: { type: DataTypes.TEXT, allowNull: true },
      cl_checked_date: { type: DataTypes.TEXT, allowNull: true },

      // page-count blanks
      cl_parcels_total_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_residential_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_office_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_shops_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_hotels_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_parcels_service_pg: { type: DataTypes.TEXT, allowNull: true },

      cl_services_facilities_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_written_assurance_pg: { type: DataTypes.TEXT, allowNull: true },

      cl_photocopy_condo_plan_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_cma_certificate_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_declaration_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_agm_minutes_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_attendance_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_insurance_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_owners_list_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_constitution_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_bylaws_pg: { type: DataTypes.TEXT, allowNull: true },
      cl_additional_bylaws_pg: { type: DataTypes.TEXT, allowNull: true },

      written_assurance_fulfilled: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'management_corporations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ManagementCorporation;
};