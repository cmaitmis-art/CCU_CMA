const { DataTypes } = require('sequelize');

const defineComposer = require('./composers.model');
const defineUser = require('./users.model');
const defineManagementCorporation = require('./managementCorporations.model');
const defineMcomRecord = require('./mcomRecords.model');
const defineCfile = require('./cfiles.model');
const defineComplaintCategory = require('./complaintCategories.model');
const defineComplaint = require('./complaints.model');
const defineComplaintApproval = require('./complaintApprovals.model');
const defineReport = require('./reports.model');
const defineDailyActivity = require('./dailyActivities.model');
const defineReportDocument = require('./reportsDocuments.model');
const defineDiscussion = require('./discussions.model');

const initializeModels = (sequelize) => {
  const models = {
    Composer: defineComposer(sequelize, DataTypes),
    User: defineUser(sequelize, DataTypes),
    ManagementCorporation: defineManagementCorporation(sequelize, DataTypes),
    McomRecord: defineMcomRecord(sequelize, DataTypes),
    Cfile: defineCfile(sequelize, DataTypes),
    ComplaintCategory: defineComplaintCategory(sequelize, DataTypes),
    Complaint: defineComplaint(sequelize, DataTypes),
    ComplaintApproval: defineComplaintApproval(sequelize, DataTypes),
    Report: defineReport(sequelize, DataTypes),
    DailyActivity: defineDailyActivity(sequelize, DataTypes),
    ReportDocument: defineReportDocument(sequelize, DataTypes),
    Discussion: defineDiscussion(sequelize, DataTypes),
  };


  models.Complaint.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.Complaint.belongsTo(models.ComplaintCategory, { foreignKey: 'category_id' });
  models.ComplaintApproval.belongsTo(models.Complaint, { foreignKey: 'complaint_id' });

  return models;
};

module.exports = initializeModels;