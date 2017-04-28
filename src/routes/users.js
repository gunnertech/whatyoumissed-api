import express from 'express';
import Rx      from 'rxjs/Rx';

import User    from '../models/user';

let router = express.Router();


router.post('/', (req, res, next) => {
  const createUser = Rx.Observable.bindNodeCallback(User.create);

  createUser({
    userId: Date.now(),
    email: "cody@gunnertech.com",
    mobile: "8609404747"
  })
  .subscribe(
    user => res.json(user),
    err => res.status(500).json(err)
  );
});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(User.scan)({})
  .subscribe(
    users => res.json(users),
    err => res.status(500).json(err)
  );
});

module.exports = router;
