import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import Account from '../models/account';
import User from '../models/user';
import {FB, FacebookApiException} from 'fb';
import {fbOauth$, fbMe$, fbPageSearch$, fbPostSearch$} from '../utils/facebook';


let router = express.Router({mergeParams: true});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(Account.query)({userId: req.params.userId})
  .subscribe(
    accounts => res.json(accounts),
    err => res.status(500).json(err)
  );
});

router.get('/facebook_loginurl.:format?', (req, res, next) => {
  let url = FB.getLoginUrl({ scope: 'user_about_me,user_friends', redirect_uri: `${process.env.BASE_URI}/users/${req.params.userId}/accounts/facebook_connect` });
  req.params.format == 'html' ?
    res.redirect(url)
    : res.json({url: url});
});

router.get('/facebook_connect', (req, res, next) => {
  const redirectUri = `${process.env.BASE_URI}/users/${req.params.userId}/accounts/facebook_connect`;
  const createAccount$ = R.curry(Account.create$)(req.params.userId);

  Rx.Observable.of(req.query)
    .do((query) => { if(query.error || !query.code) { throw { name: "Rejected", message: "The user did not allow the permissions" }; } })
    .pluck('code')
    .switchMap(code => fbOauth$({code, redirect_uri: redirectUri}))
    .pluck('access_token')
    .switchMap(accessToken => fbOauth$({redirect_uri: redirectUri, grant_type: 'fb_exchange_token', fb_exchange_token: accessToken}))
    .pluck('access_token')
    .switchMap(fbMe$)
    .map(data => Object.assign({}, {accessToken: data.access_token, accountId: data.id, name: data.name}))
    .switchMap(createAccount$)
    .subscribe(
      fbResp => res.json(fbResp),
      err => res.status(500).json(err)
    )

});

router.get('/:accountId', (req, res, next) => {
  Account.get$({type: 'facebook', userId: parseInt(req.params.userId), accountId: parseInt(req.params.accountId)})
  .subscribe(
    account => res.json(account),
    err => res.status(500).json(err)
  )
});

router.post('/:accountId/assignment', (req, res, next) => {
  let getAccount$ = Account.get$({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId});
  let updateAccount$ = R.curry(Account.update$)({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId});

  Rx.Observable.of(req.body.assignment)
  .do(console.log)
  .flatMap((assignment) => getAccount$.flatMap( account => Rx.Observable.of({account, assignments: R.union(R.propOr([], 'assignments')(account), R.of(assignment)) })) )
  .do(console.log)
  .switchMap(({account, assignments}) => updateAccount$({assignments}) )
  .do(console.log)
  .subscribe(
    data => res.json(data),
    err => res.status(500).json(err)
  )
});

router.get('/:accountId/facebook/pages', (req, res, next) => {
  let curriedSearch$ = R.curry(fbPageSearch$)(req.query.query);

  Account.get$({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId})
  .pluck('accessToken')
  .switchMap(curriedSearch$)
  .subscribe(
    fbData => res.json(fbData),
    err => res.status(500).json(err)
  )
});

router.get('/:accountId/facebook/:facebookId/posts', (req, res, next) => {
  let fbPostSearchWithFacebookId$ = R.curry(fbPostSearch$)(req.params.facebookId);
  let filterOnSelectedTypes = R.ifElse(
    R.either(R.isEmpty, R.isNil),
    (types) => R.identity,
    (types) => R.curry(R.filter(R.pipe(R.prop('type'), R.curry(R.flip(R.contains))(types))))
  )((req.query.types ? req.query.types.split(',') : null));

  let containsAccountId = R.curry(R.contains)(req.params.accountId);

  let filterOnLiked = R.ifElse(
    R.equals('liked'),
    () => R.filter(R.pipe(R.path(['likes','data']), R.pluck('id'), containsAccountId, R.not)),
    () => R.identity
  )(req.query.engagement);

  let filterOnCommented = R.ifElse(
    R.equals('commented'),
    () => R.filter(R.pipe(R.pathOr([],['comments','data']), R.pluck('from'), R.pluck('id'), containsAccountId, R.not)),
    () => R.identity
  )(req.query.engagement);


  Account.get$({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId})
  .pluck('accessToken')
  .switchMap(fbPostSearchWithFacebookId$)
  .pluck('data')
  .map(filterOnSelectedTypes)
  .map(filterOnLiked)
  .map(filterOnCommented)
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => res.status(500).json(err)
  )
});



module.exports = router;
