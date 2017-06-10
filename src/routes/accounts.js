import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import Account from '../models/account';
import User    from '../models/user';
import FB      from '../config/facebook';
import {fbOauth$, fbMe$, fbPageSearch$, fbPostSearch$, fbPostComment$} from '../utils/facebook';


let router = express.Router({mergeParams: true});

router.get('/', (req, res, next) => {
  Rx.Observable.bindNodeCallback(Account.query)({userId: req.currentUser.userId})
  .subscribe(
    accounts => res.json(accounts),
    err => res.status(500).json(err)
  );
});

router.get('/facebook/loginurl.:format?', (req, res, next) => {
  let url = FB.getLoginUrl({ scope: 'user_about_me,user_friends,publish_actions,user_posts', redirect_uri: `${process.env.BASE_URI}/accounts/facebook/auth` });
  req.params.format == 'html' ?
    res.redirect(url)
    : res.json({url: url});
});

router.get('/facebook/auth', (req, res, next) => {
  const redirectUri = `${process.env.BASE_URI}/accounts/facebook/auth`;
  
  Rx.Observable.of(req.query)
    .do((query) => { if(query.error || !query.code) { throw { name: "Rejected", message: "The user did not allow the permissions" }; } })
    .pluck('code')
    .switchMap(code => fbOauth$({code, redirect_uri: redirectUri}))
    .pluck('access_token')
    .switchMap(accessToken => fbOauth$({redirect_uri: redirectUri, grant_type: 'fb_exchange_token', fb_exchange_token: accessToken}))
    .pluck('access_token')
    .switchMap(fbMe$)
    .map(data => Object.assign({}, {type: 'facebook', accessToken: data.access_token, accountId: data.id, name: data.name, accountKey: `${data.id}-facebook`}))
    // .do(console.log)
    // .switchMap(Account.create$)
    .subscribe(
      ({accessToken, accountId, name, accountKey, type}) => {
        console.log(req.params.format)
        req.params.format === 'json' ?
          res.json({accessToken, accountId, name, accountKey, type})
          : res.redirect(`http://localhost:3000/accounts?accessToken=${accessToken}&accountId=${accountId}&name=${name}&accountKey=${accountKey}&type=${type}`);
      },
      err => {console.log(err); res.status(500).json(err) }
    )

});

router.post('/facebook/connect', (req, res, next) => {
  Account.create$({...req.body, userId: req.currentUser.userId, type: 'facebook', accountKey: `${req.body.accountId}-facebook`})
  .subscribe(
      account => res.json(account),
      err => res.status(500).json(err)
    )
});

router.get('/:accountId/facebook', (req, res, next) => {
  Account.get$({userId: req.currentUser.userId, accountKey: `${req.params.accountId}-facebook`})
  .subscribe(
    account => res.json(account),
    err => res.status(500).json(err)
  )
});

router.post('/:accountId/facebook/assignments', (req, res, next) => {
  let getAccount$ = Account.get$({userId: req.currentUser.userId, accountKey: `${req.params.accountId}-facebook`});
  let updateAccount$ = R.curry(Account.update$)({userId: req.currentUser.userId, accountKey: `${req.params.accountId}-facebook`});

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

  Account.get$({userId: req.currentUser.userId, accountKey: `${req.params.accountId}-facebook`})
  .pluck('accessToken')
  .switchMap(curriedSearch$)
  .subscribe(
    fbData => res.json(fbData),
    err => { console.log(err); res.status(500).json(err); }
  )
});

router.post('/:accountId/facebook/:facebookId/posts/:postId/comments', (req, res, next) => {
  Account.postFacebookComment$(req.params.userId, req.params.accountId, req.params.postId, req.body.message)
  .subscribe(
    fbData => res.json(fbData),
    err    => res.status(500).json(err)
  )
})

router.post('/:accountId/facebook/:facebookId/posts/:postId/shares', (req, res, next) => {
  Account.postFacebookLink$(req.params.userId, req.params.accountId, req.params.postId, req.body.link)
  .subscribe(
    fbData => res.json(fbData),
    err    => res.status(500).json(err)
  )
})

router.get('/:accountId/facebook/:facebookId/posts', (req, res, next) => {
  Account.filterFacebookPosts$(
    req.currentUser.userId, 
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

  Account.get$({userId: req.params.userId, accountKey: `${req.body.accountId}-facebook`})
  .switchMap((account) => autoPostComments$(account.userId, account.accountId, account.accessToken))
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => res.status(500).json(err)
  )
});

router.post('/:accountId/facebook/:facebookId/posts/share', (req, res, next) => {
  let autoPostShares$ = ((facebookId, postTypes) => (userId, accountId, accessToken) => Account.autoPostShares$(userId, accountId, facebookId, postTypes, accessToken))(req.params.facebookId, req.query.types)

  Account.get$({userId: req.params.userId, accountKey: `${req.body.accountId}-facebook`})
  .switchMap((account) => autoPostShares$(account.userId, account.accountId, account.accessToken))
  .subscribe(
    fbData => res.status(200).json(fbData),
    err => {console.log(err); res.status(500).json(err)}
  )
});



export default router;
