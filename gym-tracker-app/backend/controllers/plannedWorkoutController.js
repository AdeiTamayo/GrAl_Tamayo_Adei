const PlannedWorkout = require('../models/plannedWorkout');

exports.getAll = async (req, res) => {
    try {
        const planned = await PlannedWorkout.getAll(req.userId);
        res.json({ success: true, data: planned });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { date, name, routine_id, note } = req.body;
        if (!date || !name) {
            return res.status(400).json({ success: false, error: "Date and name are required" });
        }
        const planned = await PlannedWorkout.create(req.userId, date, name, routine_id, note);
        res.status(201).json({ success: true, data: planned });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { date, name, note } = req.body;
        const planned = await PlannedWorkout.update(req.params.id, req.userId, date, name, note);
        if (!planned) {
            return res.status(404).json({ success: false, error: "Planned workout not found" });
        }
        res.json({ success: true, data: planned });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await PlannedWorkout.delete(req.params.id, req.userId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Planned workout not found" });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
