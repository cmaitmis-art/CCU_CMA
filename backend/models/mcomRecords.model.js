module.exports = (sequelize, DataTypes) => {
  const McomRecord = sequelize.define(
    'McomRecord',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Excel key
      file_no: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },

      // ── Excel fields (M.Com List) ───────────────────────────────────────────
      reg_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      old_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      remark: {
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      units: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      plan_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      secretary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      secretary_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      renewal_period: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_date: {
        type: DataTypes.DATEONLY,
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

      audited_account: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      building_insurance: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      renewal_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      mc_mcom: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      engineer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      management_assistant: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      town: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      council: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      certificate_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      email_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      awareness_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // For filtering
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'New',
      },

      // Audit fields
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
    },
    {
      tableName: 'mcom_records',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return McomRecord;
};

