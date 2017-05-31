import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import Target    from '../models/target';

let router = express.Router();


router.post('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(Target.create)(req.body)
  .subscribe(
    user => res.json(target),
    err => res.status(500).json(err)
  );
});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(Target.scan)({})
  .subscribe(
    users => res.json(targets),
    err => res.status(500).json(err)
  );
});

module.exports = router;
