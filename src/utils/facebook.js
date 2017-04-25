import FB      from '../config/facebook';
import Rx      from 'rxjs/Rx';

let fbOauth$ = (options) => { 
  return Rx.Observable.bindCallback(FB.api)('oauth/access_token', 
    Object.assign({
      client_id:      FB.options('appId'),
      client_secret:  FB.options('appSecret')
    }, options)
  ).map((fbResp) => {
    if(fbResp.error) {
      throw fbResp.error;
    } else {
      return fbResp;
    }
  })
}

let fbMe$ = (accessToken) => {
  const creds = {access_token: accessToken};
  return Rx.Observable.bindCallback(FB.api)('me', creds)
    .map((fbResp) => { if(fbResp.error){  throw fbResp.error } else { return Object.assign({}, creds, fbResp); }} )
}

export {
  fbOauth$,
  fbMe$
}