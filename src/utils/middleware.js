import unless        from 'express-unless';
import * as ifMiddleware  from 'express-if';
import Rx            from 'rxjs/Rx';


import User          from '../models/user';

const setCurrentUser = (req, res, next) => {
  Rx.Observable.if(() => (req.auth && req.auth.userId), Rx.Observable.of(req.auth), Rx.Observable.throw({name: 'UnauthorizedAccessError', type: '401', message: "Invalid Token"}))
    .pluck('userId')
    .flatMap(userId => Rx.Observable.bindNodeCallback(User.get)({ userId }))
    .do(user => (req.currentUser = user))
    .subscribe(
      user => next(),
      err => { 
        delete req.currentUser;
        next(err);
      }
    );
}
setCurrentUser.unless = unless;


const adminCheck = (req, res, next) => {
  Rx.Observable.if(() => (req.currentUser && req.currentUser.roles.includes('admin')), Rx.Observable.of(req.currentUser), Rx.Observable.throw({name: 'UnauthorizedAccessError', type: '401', message: "Invalid Token"}))
    .subscribe(
      user => next(),
      err => next(err)
    );
}
adminCheck.if = ifMiddleware.default;

export { setCurrentUser, adminCheck };