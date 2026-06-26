module.exports = (sequelize, DataTypes) => {
  const Complaint = sequelize.define(
    'Complaint',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      complaint_no: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      mc_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'management_corporations',
          key: 'id',
        },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'complaint_categories',
          key: 'id',
        },
      },
      complainant_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      complainant_email: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complainant_phone: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complaint_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      subject: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'Pending',
      },
      priority: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'Normal',
      },
      days_pending: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_to_dgm: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dgm_assigned_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dgm_approval_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dgm_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      legal_officer_assigned: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      legal_officer_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      legal_officer_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolution_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
    },
    {
      tableName: 'complaints',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Complaint;
};
