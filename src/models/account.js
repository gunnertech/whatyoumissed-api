import { dynamoose, dnynamodb } from '../config/dynamodb';
import Rx           from 'rxjs/Rx';

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


let model = dynamoose.model('Account', schema);


module.exports = model;