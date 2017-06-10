import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';


import User    from '../models/user';

let router = express.Router();


router.put('/subscribe', (req, res, next) => {
  Rx.Observable.bindNodeCallback(User.update)({ userId: req.currentUser.userId }, {$ADD: {subscriptions: R.union(req.currentUser.subscriptions, [req.body.subscription])}})
  .subscribe(
    user => res.json(user),
    err => { console.log(err); res.status(500).json(err); }
  );
});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(User.scan)({})
  .subscribe(
    users => res.json(users),
    err => res.status(500).json(err)
  );
});

export default router;
