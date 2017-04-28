import { dynamoose, dnynamodb } from '../config/dynamodb';
import Rx           from 'rxjs/Rx';


var Schema = dynamoose.Schema;

var schema = new Schema({
  ownerId: {
    type: Number,
    validate: function(v) { return v > 0; },
    hashKey: true
  },
  name: {
    type: String,
    rangeKey: true,
    index: true // name: nameLocalIndex, ProjectionType: ALL
  },
  breed: {
    type: String,
    trim: true,
    required: true,
    index: {
      global: true,
      rangeKey: 'ownerId',
      name: 'BreedIndex',
      project: true, // ProjectionType: ALL
      throughput: 5 // read and write are both 5
    }
  },
  color: {
    lowercase: true,
    type: [String],
    default: ['Brown']
  },
  age: Number
},
{
  throughput: {read: 15, write: 5}
});

let model = dynamoose.model('Dog', schema);


module.exports = model;