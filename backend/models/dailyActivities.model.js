const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const DailyActivity = sequelize.define(
    'DailyActivity',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      activity_date: {
        // store as DATE (no time significance on UI)
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      activity_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      activity_category: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'daily_activities',
      timestamps: false,
    }
  );

  return DailyActivity;
};

