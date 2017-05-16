import { dynamoose, dnynamodb } from '../config/dynamodb';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';
import FB      from '../config/facebook';
import {fbOauth$, fbMe$, fbPageSearch$, fbPostSearch$, fbPostComment$, fbMeFeed$, fbPostShare$} from '../utils/facebook';

const schema = new dynamoose.Schema({ 
  userId: {
    hashKey: true,
    type: Number
  },
  accountId: {
    type: Number,
    required: true,
    rangeKey: true,
    index: true
  },
  type: {
    type: String,
    trim: true,
    lowercase: true,
    required: true,
    default: 'facebook',
    rangeKey: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  autopilot: {
    type: Boolean,
    required: true,
    default: false
  },
  accessToken: {
    type: String,
    trim: true,
    required: true
  },
  assignments: {
    type: [Object],
    default: []
  }
},
{
  timestamps: true,
  throughput: {read: 15, write: 5}
});

schema.statics.create$ = function(userId, options) {
  let Account = dynamoose.model('Account');
  return Rx.Observable.bindNodeCallback(Account.create.bind(Account))(Object.assign({}, options, {userId: userId}));
}

schema.statics.get$ = function({type, userId, accountId}) {
  let Account = dynamoose.model('Account');
  return Rx.Observable.bindNodeCallback(Account.get.bind(Account))({type, userId, accountId});
}

schema.statics.update$ = function(query, operation) {
  let Account = dynamoose.model('Account');
  return Rx.Observable.bindNodeCallback(Account.update.bind(Account))(query, operation);
}

schema.statics.postFacebookComment$ = function(userId, accountId, postId, message) {
  let Account = dynamoose.model('Account');
  let postComment$ = R.curry(fbPostComment$)(postId)(message);

  return Account.get$({type: 'facebook', userId: userId, accountId: accountId})
  .pluck('accessToken')
  .switchMap(postComment$)
}

schema.statics.postFacebookLink$ = function(userId, accountId, postId, link) {
  let Account = dynamoose.model('Account');
  let postShare$ = (link => (accessToken) => fbPostShare$(link, accessToken))(link);

  return Account.get$({type: 'facebook', userId: userId, accountId: accountId})
  .pluck('accessToken')
  .switchMap(postShare$)
}

schema.statics.autoPostComments$ = function(userId, accountId, facebookId, postTypes, accessToken) {
  let Account = dynamoose.model('Account');
  let postComment$ = (accessToken => (message, postId) => fbPostComment$(postId, message, accessToken))(accessToken);
  let randomMessage = () => { 
    const items = ["👍","😍","🙌","😵","💯","💖"];
    return items[Math.floor(Math.random()*items.length)];
  }

  return Account.filterFacebookPosts$(userId, accountId, facebookId, postTypes, 'commented')
  .concatMap(R.identity)
  .pluck('id')
  .map(function (value) { return Rx.Observable.of(value).delay(5000); })
  .concatAll()
  .mergeMap((postId) => postComment$(randomMessage(), postId))
  .bufferCount(1000)
}


schema.statics.autoPostShares$ = function(userId, accountId, facebookId, postTypes, accessToken) {
  let Account = dynamoose.model('Account');
  let postShare$ = (accessToken => (link) => fbPostShare$(link, accessToken))(accessToken);

  return Account.filterFacebookPosts$(userId, accountId, facebookId, postTypes, 'shared')
  .concatMap(R.identity)
  .pluck('link')
  .map(function (value) { return Rx.Observable.of(value).delay(5000); })
  .concatAll()
  .mergeMap((link) => postShare$(link))
  .bufferCount(1000)
}

schema.statics.filterFacebookPosts$ = function(userId, accountId, facebookId, postTypes, engagementType) {
  console.log(accountId)
  let Account = dynamoose.model('Account');
  let fbPostSearchWithFacebookId$ = R.curry(fbPostSearch$)(facebookId);
  let filterOnSelectedTypes = R.ifElse(
    R.either(R.isEmpty, R.isNil),
    (types) => R.identity,
    (types) => R.curry(R.filter(R.pipe(R.prop('type'), R.curry(R.flip(R.contains))(types))))
  )((postTypes ? postTypes.split(',') : null));
  
  let containsAccountId = R.curry(R.contains)(accountId);
  
  let filterOnLiked = R.ifElse(
    R.equals('liked'),
    () => R.filter(R.pipe(R.path(['likes','data']), R.pluck('id'), containsAccountId, R.not)),
    () => R.identity
  )(engagementType);
  
  let filterOnCommented = R.ifElse(
    R.equals('commented'),
    () => R.filter(R.pipe(R.pathOr([],['comments','data']), R.pluck('from'), R.pluck('id'), containsAccountId, R.not)),
    () => R.identity
  )(engagementType);

  let filterOnShared = ((engagementType) => { 
    return (truthFunction, falseFunction) => {
      return R.ifElse(
        R.equals('shared'),
        () => truthFunction,
        () => falseFunction
      )(engagementType);
    }
  })(engagementType)
    

  return Account.get$({type: 'facebook', userId: userId, accountId: accountId})
  .pluck('accessToken')
  .switchMap((accessToken) => {
    return filterOnShared(
      Rx.Observable.combineLatest(
        fbPostSearchWithFacebookId$(accessToken).pluck('data'),
        fbMeFeed$(accessToken).pluck('data')
      ).map((combinedData) => {
        return R.differenceWith((pagePost, mePost) => pagePost.id === mePost.parent_id, combinedData[0], combinedData[1])
      }),
      fbPostSearchWithFacebookId$(accessToken).pluck('data')
    );
  })
  .map(filterOnSelectedTypes)
  .map(filterOnLiked)
  .map(filterOnCommented)

}

// schema.statics.filterFacebookPosts$ = function(userId, accountId, facebookId, postTypes, engagementType) {
//   // Get all post ids from country shore
//   // Get all post parent ids from me
//   // Get all ids that are in post ids but not parent ids
// }


let model = dynamoose.model('Account', schema);


module.exports = model;