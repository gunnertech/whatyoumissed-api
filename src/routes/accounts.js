import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';

import Account from '../models/account';
import {FB, FacebookApiException} from 'fb';
import {fbOauth$, fbMe$} from '../utils/facebook';


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

module.exports = router;
