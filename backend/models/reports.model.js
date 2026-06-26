module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    'Report',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      report_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      generated_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'reports',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return Report;
};