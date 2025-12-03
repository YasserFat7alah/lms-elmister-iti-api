import passport from 'passport';

import User from '../../models/users/User.js';
import googleStrategy from './google.startegy.js';


passport.serializeUser((user, done) => done(null, user._id) );

passport.deserializeUser( async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google Oauth
passport.use( googleStrategy );

export default passport;