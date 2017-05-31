import express       from 'express';
import path          from 'path';
import logger        from 'morgan';
import cookieSession from 'cookie-session';
import cookieParser  from 'cookie-parser';
import bodyParser    from 'body-parser';
import favicon       from 'serve-favicon';
import jwt           from 'express-jwt';
import unless        from 'express-unless';


import users         from './routes/users';
import facebook      from './routes/facebook';
import accounts      from './routes/accounts';


let app = express();



// import { dynamoose, dynamodb } from './config/dynamodb';

// dynamodb.deleteTable({ TableName: "User" }, console.log);
// dynamodb.listTables(console.log);

// import Dog          from './models/dog';

// Dog.create({
//   ownerId: 4,
//   name: 'Odie',
//   breed: 'Beagle',
//   color: ['Tan'],
//   cartoon: true
// }, function(err, odie) {
//   if(err) { return console.log(err); }
//   console.log('Odie is a ' + odie.breed);
// });

// Dog.get({ownerId: 4, name: 'Odie'}, function(err, odie) {
//   if(err) { return console.log(err); }
//   console.log('Odie is a ' + odie.breed);
// });


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({ secret: 'secret'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../public')));

const jwtCheck = jwt({
  secret: process.env.SECRET || 'somethingsupersecretandsafe'
});

jwtCheck.unless = unless;

app.use(jwtCheck.unless({path: '/users/login' }));
app.use(utils.middleware().unless({path: '/users/login' }));
app.use('/facebook', facebook);
app.use('/users',    users);
app.use('/users/:userId/accounts', accounts);


app.use(favicon(__dirname + '/../public/images/favicon.ico'));
// using arrow syntax
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (process.env.NODE_ENV === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({error: err, message: err.message})
  });
}

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json(err);
});


module.exports = app;