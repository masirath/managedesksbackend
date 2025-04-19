const express = require('express');
const router = express.Router();
const upload = require('../Global/upload'); // Correct path to Global folder
const { uploadFiles } = require('../controllers/documentController');
const { authorization } = require('../Global/authorization'); // If you have this

router.post('/api/upload', 
  authorization, // Optional auth middleware
  upload.array('documents', 5), // Max 5 files
  uploadFiles
);

module.exports = router;