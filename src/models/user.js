import Rx           from 'rxjs/Rx';
import { dynamoose, dnynamodb } from '../config/dynamodb';

let schema = new dynamoose.Schema({ 
  userId: {
    hashKey: true,
    type: Number
  },
  email: {
    type: String,
    trim: true,
    required: true,
    lowercase: true,
    index: {
      global: true,
      project: true, // ProjectionType: ALL
      throughput: 5 // read and write are both 5
    }
  },
  mobile: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    trim: true
  },
  roles: {
    type: [String],
    lowercase: true,
    default: ['default']
  },
  subscriptions: {
    type: [String],
    lowercase: true,
    default: []
  },
  passwordResetToken: {
    type: String,
    trim: true
  },
  passwordResetTokenExpiresAt: {
    type: Date
  }
},
{
  timestamps: true,
  throughput: {read: 15, write: 5}
}); 

schema.methods.toJSON = function(){ return {...this, password: undefined} }

const model = dynamoose.model('User', schema);

export default model;