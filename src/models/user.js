import Rx           from 'rxjs/Rx';
import { dynamoose, dnynamodb } from '../config/dynamodb';

const schema = new dynamoose.Schema({ 
  userId: {
    hashKey: true,
    type: Number
  },
  email: {
    type: String,
    trim: true,
    required: true
  },
  mobile: {
    type: String,
    trim: true,
    required: true
  },
  roles: {
    type: [String],
    lowercase: true,
    default: ['default']
  }
},
{
  timestamps: true,
  throughput: {read: 15, write: 5}
});

const model = dynamoose.model('User', schema);

module.exports = model;