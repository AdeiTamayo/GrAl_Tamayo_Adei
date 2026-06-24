const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const plannedWorkoutController = require("../controllers/plannedWorkoutController");

router.use(authMiddleware);

router.get("/", plannedWorkoutController.getAll);
router.post("/", plannedWorkoutController.create);
router.put("/:id", plannedWorkoutController.update);
router.delete("/:id", plannedWorkoutController.delete);

module.exports = router;
