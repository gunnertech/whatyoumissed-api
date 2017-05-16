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

let fbPostComment$ = (objectId, message, accessToken) => {
  return Rx.Observable.bindCallback(FB.api)(`${objectId}/comments`, 'post', {message: message, access_token: accessToken});
}

let fbPostShare$ = (link, accessToken) => {
  return Rx.Observable.bindCallback(FB.api)(`me/feed`, 'post', {link: link, access_token: accessToken});
}

let fbMe$ = (accessToken) => {
  const creds = {access_token: accessToken};
  return Rx.Observable.bindCallback(FB.api)('me', creds)
    .map((fbResp) => { if(fbResp.error){  throw fbResp.error } else { return Object.assign({}, creds, fbResp); }} )
}

let fbMeFeed$ = (accessToken) => {
  const options = {access_token: accessToken, fields: ["link", "message", "type", "parent_id"], limit: 100};
  return Rx.Observable.bindCallback(FB.api)('me/feed', options)
    .map((fbResp) => { if(fbResp.error){  throw fbResp.error } else { return Object.assign({}, options, fbResp); }} )
}

let fbPageSearch$ = (query, accessToken) => {
  const options = {access_token: accessToken, type: 'page', q: query, limit: 100};
  return Rx.Observable.bindCallback(FB.api)('search', options)
}

let fbPostSearch$ = (facebookId, accessToken) => {
  const options = {access_token: accessToken, limit: 100, fields: ['id','actions','url','event','images','comments','message','name','picture','description','type','link','shares','likes.limit(1000){id,name,link}']};
  return Rx.Observable.bindCallback(FB.api)(`${facebookId}/feed`, options)
    .map(fbResponse => Object.assign({}, fbResponse, {accessToken}))
}

export {
  fbOauth$,
  fbMe$,
  fbPageSearch$,
  fbPostSearch$,
  fbPostComment$,
  fbMeFeed$,
  fbPostShare$
}