const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/searchController');
const { isAuth } = require('../middlewares/auth');

router.use(isAuth);
router.get('/', ctrl.search);
router.get('/users', ctrl.searchUsers);

module.exports = router;
