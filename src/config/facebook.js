import {FB, FacebookApiException} from 'fb';

FB.options({
  appId:          process.env.FACEBOOK_APP_ID,
  appSecret:      process.env.FACEBOOK_APP_SECRET,
  redirectUri:    process.env.BASE_URI,
  version:        'v2.9'
});

export default FB;