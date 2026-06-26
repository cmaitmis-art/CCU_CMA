module.exports = (sequelize, DataTypes) => {
  const ComplaintCategory = sequelize.define(
    'ComplaintCategory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'complaint_categories',
      timestamps: false,
    }
  );

  return ComplaintCategory;
};
