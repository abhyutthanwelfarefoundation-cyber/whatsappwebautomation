const express = require('express');
const controller = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateQuery } = require('../validators/common.validator');

const router = express.Router();

router.get('/', authenticate, validateQuery('globalSearch'), controller.search);

module.exports = router;
