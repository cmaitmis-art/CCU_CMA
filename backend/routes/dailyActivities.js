const express = require('express');
const { Op } = require('sequelize');

module.exports = (models) => {
  const router = express.Router();
  const { DailyActivity } = models;

  // Create new daily activity (formerly upsert)
  router.post('/upsert', async (req, res) => {
    try {
      const {
        user_id,
        activity_date,
        activity_text,
        activity_category,
        status,
      } = req.body || {};

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });
      if (!activity_date) return res.status(400).json({ error: 'activity_date is required' });
      if (!activity_text) return res.status(400).json({ error: 'activity_text is required' });

      const created = await DailyActivity.create({
        user_id,
        activity_date,
        activity_text,
        activity_category: activity_category ?? null,
        status: status ?? null,
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('DailyActivity create error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // List activities by optional date filter
  router.get('/', async (req, res) => {
    try {
      const { user_id, date } = req.query;

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const where = { user_id };
      if (date) {
        // date expected as YYYY-MM-DD
        where.activity_date = { [Op.eq]: date };
      }

      const items = await DailyActivity.findAll({
        where,
        order: [['activity_date', 'DESC'], ['id', 'DESC']],
      });

      res.json({ items });
    } catch (err) {
      console.error('DailyActivity list error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a daily activity
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await DailyActivity.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      await record.destroy();
      res.json({ message: 'Activity deleted successfully' });
    } catch (err) {
      console.error('DailyActivity delete error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get dynamic user timeline activity logs across all modules
  router.get('/user-timeline', async (req, res) => {
    try {
      const { name, username } = req.query;
      if (!name && !username) {
        return res.status(400).json({ error: 'name or username is required' });
      }

      // Construct search criteria matching variations of name / username
      const userTerms = [];
      if (name) userTerms.push(`%${name}%`);
      if (username) userTerms.push(`%${username}%`);

      const orConditions = [];
      for (const term of userTerms) {
        orConditions.push({ created_by: { [Op.like]: term } });
        orConditions.push({ modified_by: { [Op.like]: term } });
      }

      const where = { [Op.or]: orConditions };

      // Query latest 5 entries across primary audited tables in parallel
      const [mcs, mcoms, cfiles, complaints, discussions] = await Promise.all([
        models.ManagementCorporation.findAll({ where, limit: 5, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.McomRecord.findAll({ where, limit: 5, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Cfile.findAll({ where, limit: 5, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Complaint.findAll({ where, limit: 5, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Discussion.findAll({ where, limit: 5, order: [['updated_at', 'DESC']] }).catch(() => []),
      ]);

      const logs = [];

      mcs.forEach(mc => {
        logs.push({
          time: mc.updated_at || mc.created_at,
          text: `MC record updated — ${mc.management_corporation_name || mc.name || mc.file_no || 'Liberty Plaza'}`
        });
      });

      mcoms.forEach(m => {
        logs.push({
          time: m.updated_at || m.created_at,
          text: `M.Com record updated — ${m.management_corporation_name || m.new_file_no || m.old_file_no || 'Peterson Court'}`
        });
      });

      cfiles.forEach(cf => {
        logs.push({
          time: cf.updated_at || cf.created_at,
          text: `C File updated — ${cf.file_no || cf.name_of_apartment || 'CF-2026-004'}`
        });
      });

      complaints.forEach(c => {
        logs.push({
          time: c.updated_at || c.created_at,
          text: `Complaint updated — ${c.file_no || c.name_of_apartment || 'CMP-2026-002'}`
        });
      });

      discussions.forEach(d => {
        logs.push({
          time: d.updated_at || d.created_at,
          text: `Discussion updated — ${d.appointment || 'Meeting'}`
        });
      });

      // Sort combined activity logs by timestamp desc and take the top 5
      logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      const top5 = logs.slice(0, 5);

      res.json({ items: top5 });
    } catch (err) {
      console.error('User timeline summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

