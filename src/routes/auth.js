import express from 'express';
import Rx      from 'rxjs/Rx';
import R       from 'ramda';
import bcrypt  from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import uuid from 'node-uuid';
import moment from 'moment';

import mailer  from '../config/mailer';
import User    from '../models/user';

let router = express.Router();

const TOKEN_EXPIRATION = 60;
const TOKEN_EXPIRATION_SEC = TOKEN_EXPIRATION * 60;
const bnc = Rx.Observable.bindNodeCallback;

//Streams
const throwAuthError = () => Rx.Observable.throw({type: '401', message: "Invalid Email or Password"})
const credentialsValidOrError = (credentials) => Rx.Observable.if(() => R.any(R.isNil)(credentials), Rx.Observable.throw({type: '401', message: "Invalid Email or Password"}), Rx.Observable.of(credentials));
const createToken = (user) => { 
  let data = {...user, token: jsonwebtoken.sign({userId: user.userId}, process.env.SECRET_TOKEN, {expiresIn: TOKEN_EXPIRATION_SEC})}
  const decoded = jsonwebtoken.decode(data.token);

  data.token_exp = decoded.exp;
  data.token_iat = decoded.iat;

  return data;
}
const findOrError = ([email, password=""]) => {
  return bnc(User.query)({email: {eq: email} })
    .flatMap(users => Rx.Observable.if(() => R.isEmpty(users), throwAuthError(), Rx.Observable.of([password, users[0]])))
}

//Endpoints
router.post('/login', (req, res, next) => {
  const credentials = [req.body.email, req.body.password];
  const validatePasswordOrError = ([password, user]) => Rx.Observable.if(() => bcrypt.compareSync(password, user.password), Rx.Observable.of(user), throwAuthError());

  Rx.Observable.of(credentials)
    .flatMap(credentialsValidOrError)
    .flatMap(findOrError)
    .flatMap(validatePasswordOrError)
    .map(createToken)
    .map( data => ({...data, password: undefined}))
    .subscribe(
      user => res.json(user),
      next
    );
});

router.post('/register', (req, res, next) => {
  const credentials = [req.body.email, req.body.password];
  const throwEmailError = () => Rx.Observable.throw({type: '401', message: "Email Address Taken"})
  const uniqueOrError = ([email, password]) => {
    return bnc(User.query)({email: {eq: email} })
      .map(R.filter(R.pipe(R.prop('lastKey'), R.not)))
      .flatMap(users => Rx.Observable.if(() => R.isEmpty(users), Rx.Observable.of([email, password]), throwEmailError() ))
  }
  const createUser = ({userId, email, password}) => bnc(User.create)({userId, email, password});

  Rx.Observable.of(credentials)
    .flatMap(credentialsValidOrError)
    .flatMap(uniqueOrError)
    .map(([email, password]) => ({userId: Date.now(), email, password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)}))
    .flatMap(createUser)
    .map(createToken)
    .map( data => ({...data, password: undefined}))
    .subscribe(
      data => res.json(data),
      next
    );
});

router.post('/password/request-reset', (req, res, next) => {
  const credentials = [req.body.email];
  const params = {
    passwordResetToken: uuid.v4(),
    passwordResetTokenExpiresAt: moment().add(2, 'hours').toDate()
  }
  const saveResetToken = (({passwordResetToken, passwordResetTokenExpiresAt}) => {
    return user => bnc(User.update)({userId: user.userId},{passwordResetToken, passwordResetTokenExpiresAt})
                    .map( () => ({...user, passwordResetToken, passwordResetTokenExpiresAt}) )
  })(params)
  
  const sendEmail = (user) => {
    let mailOptions = {
      from: '"No-Reply" <website@johnsislandrealestate.com>',
      to: user.email,
      subject: 'Password Reset',
      text: `Your password reset token is ${user.passwordResetToken} and will be valid for 2 hours.
            To reset your password, click or copy this link into your browser http://localhost:4000/password/reset?resetToken=${user.passwordResetToken}`
    }
    return bnc(mailer.sendMail).call(mailer, mailOptions);
  }


  Rx.Observable.of(credentials)
    .flatMap(credentialsValidOrError)
    .flatMap(findOrError)
    .map(([password, user]) => user)
    .flatMap(saveResetToken)
    .flatMap(sendEmail)
    .subscribe(
      data => res.json(data),
      err => { console.log(err); res.status(err.type).json(err.message); }
    );
});

router.post('/password/reset', (req, res, next) => {
  console.log(req.body.passwordResetToken)
  const credentials = [req.body.email, req.body.password, req.body.passwordResetToken];
  const throwTokenError = () => Rx.Observable.throw({type: '401', message: "Token is invalid"});
  const resetTokenMatchesOrError = (resetToken => user => Rx.Observable.if(() => (user.passwordResetToken == resetToken), Rx.Observable.of(user), throwTokenError() ))(req.body.passwordResetToken)
  const resetTokenValidOrError = (now => user => Rx.Observable.if(() => (now < user.passwordResetTokenExpiresAt), Rx.Observable.of(user), throwTokenError() ))(Date.now());
  const hashPassword = (password => user => [user, bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)])(req.body.password)

  Rx.Observable.of(credentials)
    .flatMap(credentialsValidOrError)
    .flatMap(findOrError)
    .map(([password, user]) => user)
    .do(console.log)
    .flatMap(resetTokenMatchesOrError)
    .flatMap(resetTokenValidOrError)
    .map(hashPassword)
    .flatMap(([user, password]) => bnc(User.update)({userId: user.userId},{password}))
    .flatMap(user => bnc(User.update)({userId: user.userId},{$DELETE: {passwordResetToken: null, passwordResetTokenExpiresAt: null}}))
    .subscribe(
      user => res.json(user),
      next
    );
});


router.put('/add-role', (req, res, next) => {
  const addRole = R.curry((role, user) => bnc(User.update)({ userId: user.userId }, {roles: R.union(user.roles, [role])}))(req.body.role)
  
  bnc(User.get)({ userId: req.body.userId })
  .switchMap(addRole)
  .subscribe(
    user => res.json(user),
    next
  );
});

export default router;
