const express = require('express');
const { Op } = require('sequelize');

module.exports = (models) => {
  const router = express.Router();
  const { DailyActivity } = models;

  // Upsert daily activity by (user_id, activity_date)
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

      const existing = await DailyActivity.findOne({
        where: { user_id, activity_date },
      });

      if (existing) {
        existing.activity_text = activity_text;
        existing.activity_category = activity_category ?? null;
        existing.status = status ?? null;
        existing.updated_at = new Date();
        await existing.save();
        return res.status(200).json(existing);
      }

      const created = await DailyActivity.create({
        user_id,
        activity_date,
        activity_text,
        activity_category: activity_category ?? null,
        status: status ?? null,
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('DailyActivity upsert error:', err);
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

  return router;
};

