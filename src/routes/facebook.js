import express from 'express';
import {FB, FacebookApiException} from 'fb';
import Promise from 'bluebird';

let router = express.Router();

FB.options({
  appId:          process.env.FACEBOOK_APP_ID,
  appSecret:      process.env.FACEBOOK_APP_SECRET,
  redirectUri:    "http://localhost:4000/facebook/callback"
});

router.get('/me', (req, res, next) => {
  new Promise((resolve, reject) => {
    FB.api('me', {
      access_token:   (req.session.access_token||process.env.FACEBOOK_ACCESS_TOKEN)
    }, (fbResp) => (!fbResp || fbResp.error) ? reject(fbResp.error) : resolve(fbResp) )
  })
  .then((result) => {
    return res.json(result)
  })
  .catch((err) => {
    return res.status(500).json(err)
  })
});


router.get('/posts', (req, res, next) => {
  new Promise((resolve, reject) => {
    FB.api('countryshore/feed', {
      access_token:   (req.session.access_token||process.env.FACEBOOK_ACCESS_TOKEN)
    }, (fbResp) => (!fbResp || fbResp.error) ? reject(fbResp.error) : resolve(fbResp) )
  })
  .then((result) => {
    let postsNotLiked = result.data.filter((post) => {
      return post.likes.data.findIndex((like) => like.id == process.env.FACEBOOK_USER_ID) == -1
    })
    result.data.forEach((post) => {
      console.log(postsNotLiked)
    })
    return res.json(postsNotLiked.map(value => ({link: value['link'], picture: value['picture'], message: value['message']})))
  })
  .catch((err) => {
    return res.status(500).json(err)
  })
});

router.get('/loginurl.:format?', (req, res, next) => {
  let url = FB.getLoginUrl({ scope: 'user_about_me,user_friends', redirect_uri: `${process.env.BASE_URI}/users/${1493092790069}/accounts/facebook_connect` });
  req.params.format == 'html' ?
    res.redirect(url)
    : res.json({url: url});
});

router.get('/callback', (req, res, next) => {
  let code = req.query.code;

  if(req.query.error) {
    return res.status(500).json({ name: "Rejected", message: "The user did not allow the permissions" });
  } else if(!code) {
    return res.status(500).json({ name: "Rejected", message: "The user did not allow the permissions" });
  }

  new Promise((resolve, reject) => {
    FB.api('oauth/access_token', {
      client_id:      FB.options('appId'),
      client_secret:  FB.options('appSecret'),
      redirect_uri:   FB.options('redirectUri'),
      code:           code
    }, (fbResp) => {
      if(!fbResp || fbResp.error) {
        return reject(fbResp.error);
      }

      resolve(fbResp);
    });
  })
  .then((fbResp) => {
    return new Promise((resolve, reject) => {
      FB.api('oauth/access_token', {
        client_id:          FB.options('appId'),
        client_secret:      FB.options('appSecret'),
        grant_type:         'fb_exchange_token',
        fb_exchange_token:  fbResp.access_token
      }, (fbResp) => {
        if(!fbResp || fbResp.error) {
          return reject(fbResp.error);
        }

        resolve(fbResp);
      });
    });
  })
  .then((fbResp) => {
    req.session.access_token = fbResp.access_token;
    req.session.expires = fbResp.expires || 0;

    return res.json(fbResp);
  })
  .catch((err) => {
    return res.status(500).json(err);
  })
});

module.exports = router;
