import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import Account from '../models/account';
import User    from '../models/user';
import FB      from '../config/facebook';
import {fbOauth$, fbMe$, fbPageSearch$, fbPostSearch$, fbPostComment$} from '../utils/facebook';


let router = express.Router({mergeParams: true});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(Account.query)({userId: req.params.userId})
  .subscribe(
    accounts => res.json(accounts),
    err => res.status(500).json(err)
  );
});

router.get('/facebook/loginurl.:format?', (req, res, next) => {
  let url = FB.getLoginUrl({ scope: 'user_about_me,user_friends,publish_actions,user_posts', redirect_uri: `${process.env.BASE_URI}/users/${req.params.userId}/accounts/facebook/connect` });
  req.params.format == 'html' ?
    res.redirect(url)
    : res.json({url: url});
});

router.get('/facebook/connect', (req, res, next) => {
  const redirectUri = `${process.env.BASE_URI}/users/${req.params.userId}/accounts/facebook/connect`;
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
  .flatMap((assignment) => getAccount$.flatMap( account => Rx.Observable.of({account, assignments: R.union(R.propOr([], 'assignments')(account), R.of(assignment)) })) )
  .switchMap(({account, assignments}) => updateAccount$({assignments}) )
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

router.post('/:accountId/facebook/:facebookId/posts/:postId/comments', (req, res, next) => {
  Account.postFacebookComment$(req.params.userId, req.params.accountId, req.params.postId, req.body.message)
  .subscribe(
    fbData => res.json(fbData),
    err    => res.status(500).json(err)
  )
})

router.get('/:accountId/facebook/:facebookId/posts', (req, res, next) => {
  Account.filterFacebookPosts$(
    req.params.userId, 
    req.params.accountId, 
    req.params.facebookId, 
    req.query.types, 
    req.query.engagement)
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => {console.log(err); res.status(500).json(err)}
  )
});

router.post('/:accountId/facebook/:facebookId/posts/comment', (req, res, next) => {
  let autoPostComments$ = ((facebookId, postTypes) => (userId, accountId, accessToken) => Account.autoPostComments$(userId, accountId, facebookId, postTypes, accessToken))(req.params.facebookId, req.query.types)

  Account.get$({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId})
  .switchMap((account) => autoPostComments$(account.userId, account.accountId, account.accessToken))
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => res.status(500).json(err)
  )
});

router.post('/:accountId/facebook/:facebookId/posts/share', (req, res, next) => {
  let autoPostShares$ = ((facebookId, postTypes) => (userId, accountId, accessToken) => Account.autoPostShares$(userId, accountId, facebookId, postTypes, accessToken))(req.params.facebookId, req.query.types)

  Account.get$({type: 'facebook', userId: req.params.userId, accountId: req.params.accountId})
  .switchMap((account) => autoPostShares$(account.userId, account.accountId, account.accessToken))
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => {console.log(err); res.status(500).json(err)}
  )
});



module.exports = router;
