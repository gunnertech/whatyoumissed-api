var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/james', function(req, res, next) {
  console.log("HIIIII")
  res.json({ title: 'Express' });
});

module.exports = router;
