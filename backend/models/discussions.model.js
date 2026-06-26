const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Discussion = sequelize.define(
    'Discussion',
    {
      date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      file_no: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,  // Explicitly disable unique constraint
      },
      appointment: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,  // Explicitly disable unique constraint
      },
      complaint: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      respond: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meeting_date_time: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      venue: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reminder_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reminder_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      officer: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
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
      tableName: 'discussions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Discussion;
};
