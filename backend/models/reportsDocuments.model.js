module.exports = (sequelize, DataTypes) => {
  const ReportDocument = sequelize.define(
    'ReportDocument',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      file_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      storage_path: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // Optional relation if you later want to attach docs to a generated report
      report_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Audit fields (some older DB dumps may not have these columns)
      // They are kept nullable so inserts still work.
      // If columns are missing, queries will fail unless we migrate (handled in db.js).
      created_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deleted_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'report_documents',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return ReportDocument;
};
