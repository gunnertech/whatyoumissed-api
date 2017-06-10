import express       from 'express';
import path          from 'path';
import logger        from 'morgan';
import cookieSession from 'cookie-session';
import cookieParser  from 'cookie-parser';
import bodyParser    from 'body-parser';
import favicon       from 'serve-favicon';
import jwt           from 'express-jwt';
import unless        from 'express-unless';

import mailer from './config/mailer';

////ROUTES
import auth          from './routes/auth';
import users         from './routes/users';
import facebook      from './routes/facebook';
import accounts      from './routes/accounts';

////Middleware
import {setCurrentUser, adminCheck}         from './utils/middleware';


const app = express();

const jwtCheck = jwt({
  secret: process.env.SECRET_TOKEN,
  requestProperty: 'auth',
  getToken: (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.jwttoken) {
      return req.query.jwttoken;
    }
    return null;
  }
});
jwtCheck.unless = unless;

const pathsThatDontRequireAuth = [
  '/auth/login',
  '/auth/register',
  '/auth/password/request-reset',
  '/auth/password/reset',
  '/accounts/facebook/auth'
];

const adminPaths = [
];




app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({ secret: 'secret'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../public')));
app.use(favicon(__dirname + '/../public/images/favicon.ico'));



////Middleware
app.use((req, res, next) => {

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, EncryptionKey");

  if ('OPTIONS' === req.method) {
    res.sendStatus(200);
  }
  else {
    next();
  }
});
app.use(jwtCheck.unless({path: pathsThatDontRequireAuth}));
app.use(setCurrentUser.unless({path: pathsThatDontRequireAuth}));
app.use(adminCheck.if({path: adminPaths}));

////ROUTES
app.use('/auth',                   auth);
app.use('/facebook',               facebook);
app.use('/users',                  users);
app.use('/accounts', accounts);

app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (process.env.NODE_ENV === 'development') {
  app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.status || err.type || 500).json({error: err, message: err.message})
  });
}

module.exports = app;