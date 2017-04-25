import dynamoose    from 'dynamoose';
import Rx           from 'rxjs/Rx';

const schema = new dynamoose.Schema({ 
  userId: {
    hashKey: true,
    type: Number
  },
  accountId: {
    type: Number,
    required: true,
    rangeKey: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    trim: true,
    lowercase: true,
    required: true,
    default: 'facebook'
  },
  accessToken: {
    type: String,
    trim: true,
    required: true
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


let model = dynamoose.model('Account', schema);


module.exports = model;