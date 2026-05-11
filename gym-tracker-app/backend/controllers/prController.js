const PR = require('../models/pr');

exports.getPrSummary = async (req, res) => {
    try {
        const prs = await PR.getPrSummary(req.userId);
        res.json({ success: true, data: prs });
    } catch (error) {
        console.error("Error fetching PR summary:", error);
        res.status(500).json({ success: false, error: 'Failed to get PR summary' });
    }
};

exports.getPrHistory = async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const history = await PR.getPrHistory(req.userId, exerciseId);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error("Error fetching PR history:", error);
        res.status(500).json({ success: false, error: 'Failed to get PR history' });
    }
};

exports.createPR = async (req, res) => {
    try {
        const { exercise_id, weight, repetitions, date, note } = req.body;
        const pr = await PR.createPR(req.userId, exercise_id, weight, repetitions, date, note);
        res.status(201).json({ success: true, data: pr });
    } catch (error) {
        console.error("Error creating PR:", error);
        res.status(500).json({ success: false, error: 'Failed to manually create PR' });
    }
};

exports.deletePR = async (req, res) => {
    try {
        const prId = req.params.id;
        const success = await PR.deletePR(req.userId, prId);

        if (success) {
            res.json({ success: true, message: 'PR deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'PR not found or you do not have permission to delete it' });
        }
    } catch (error) {
        console.error("Error deleting PR:", error);
        res.status(500).json({ success: false, error: 'Failed to delete PR' });
    }
};