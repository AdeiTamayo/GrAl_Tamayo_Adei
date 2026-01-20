const axios = require('axios');
require('dotenv').config();

// Fetch exercises from ExerciseDB API
exports.getExercises = async (req, res) => {
  try {
    const response = await axios.get("https://exercisedb.p.rapidapi.com/exercises", {
      headers: {
        'X-RapidAPI-Key': process.env.RapidAPI_Key,
      },
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      console.error('API response error:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching exercises:', error.message);
    }
    res.status(500).json({ error: 'Failed to fetch exercises', details: error.message });
  }
};
