import Rx           from 'rxjs/Rx';
import { dynamoose, dnynamodb } from '../config/dynamodb';

const schema = new dynamoose.Schema({ 
  accountId: {
    hashKey: true,
    type: Number
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
  }
},
{
  timestamps: true,
  throughput: {read: 15, write: 5}
});

const model = dynamoose.model('Target', schema);

module.exports = model;