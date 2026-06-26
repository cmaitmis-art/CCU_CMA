module.exports = (sequelize, DataTypes) => {
  const ComplaintApproval = sequelize.define(
    'ComplaintApproval',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      complaint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      approved_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approval_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approval_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'complaint_approvals',
      timestamps: true,
      createdAt: 'approval_date',
      updatedAt: false,
    }
  );

  return ComplaintApproval;
};