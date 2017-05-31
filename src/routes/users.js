import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import User    from '../models/user';

let router = express.Router();

router.post('/login', (req, res, next) => {
  const credentials = [req.body.email, req.body.password];
  const throwAuthError = () => Rx.Observable.throw(new Error(type: '401', message: "Invalid Email or Password"))
  const bothCredentialsPresentOrError = (credentials) => Rx.Observable.if(() => R.any(R.isEmpty)(credentials), Rx.Observable.throw(new Error(type: '401', message: "Invalid Email or Password")), Rx.Observable.of(credentials));
  const findOrError = ([email, password]) => {
    return Rx.Observable.bindNodeCallback(User.scan)({ email }) 
      .flatMap(users => Rx.Observable.if(() => R.isEmpty(users), throwAuthError(), Rx.Observable.of(users[0]))
      .catch(throwAuthError)
  }
  const validatePasswordOrError = (password, user) => {
    return Rx.Observable.bindNodeCallback(bcrypt.compare)(password, user.password) 
      .flatMap(isMatch => Rx.Observable.if(() => isMatch, Rx.Observable.of(user), throwAuthError())
      .catch(throwAuthError)
  }

  Rx.Observable.of(credentials)
    .flatMap(bothCredentialsPresentOrError)
    .flatMap(findOrError)
    .flatMap(validatePasswordOrError)
    .subscribe(
      user => res.json(user),
      err => res.status(err.type).json(err.message)
    );
})


router.post('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(User.create)({
    userId: Date.now(),
    email: "cody@gunnertech.com",
    mobile: "8609404747"
  })
  .subscribe(
    user => res.json(user),
    err => res.status(500).json(err)
  );
});

router.put('/:userId/roles/add', (req, res, next) => {
  const addRole = R.curry((role, user) => Rx.Observable.bindNodeCallback(User.update)({ userId: user.userId }, {roles: R.union(user.roles, [role])}))(req.body.role)
  
  Rx.Observable.bindNodeCallback(User.get)({ userId: req.params.userId })
  .switchMap(addRole)
  .subscribe(
    user => res.json(user),
    err => { console.log(err); res.status(500).json(err); }
  );
});

router.put('/:userId/subscriptions/add', (req, res, next) => {
  const addSubscription = R.curry((subscription, user) => Rx.Observable.bindNodeCallback(User.update)({ userId: user.userId }, {roles: R.union(user.subscriptions, [subscription])}))(req.body.subscription)
  
  Rx.Observable.bindNodeCallback(User.get)({ userId: req.params.userId })
  .switchMap(addSubscription)
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

module.exports = router;
