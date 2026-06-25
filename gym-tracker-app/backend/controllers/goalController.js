const Goal = require('../models/goal');

exports.getGoals = async (req, res) => {
    console.log("Get all goals request received");
    try {
        const goals = await Goal.getUserGoals(req.userId);
        res.json({ success: true, goals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createGoal = async (req, res) => {
    console.log("Create goal request received");
    try {
        const { exercise_id, target_weight, target_reps, expected_date } = req.body;
        const newGoal = await Goal.createGoal(req.userId, exercise_id, target_weight, target_reps, expected_date);
        res.json({ success: true, goal: newGoal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateGoal = async (req, res) => {
    console.log("Update goal request received");
    try {
        const { target_weight, target_reps, expected_date } = req.body;
        const updatedGoal = await Goal.updateGoal(req.params.id, req.userId, target_weight, target_reps, expected_date);
        if (updatedGoal) {
            res.json({ success: true, goal: updatedGoal });
        } else {
            res.status(404).json({ success: false, error: "Goal not found or unauthorized" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteGoal = async (req, res) => {
    console.log("Delete goal request received");
    try {
        const deleted = await Goal.deleteGoal(req.params.id, req.userId);
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: "Goal not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};