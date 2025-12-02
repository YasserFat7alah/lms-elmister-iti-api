import { Strategy } from 'passport-google-oauth20';
import AppError from '../../utils/app.error.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SERVER_URL } from '../../utils/constants.js';
import authService from '../../services/auth.service.js';

const callbackURL = `${SERVER_URL}/api/v1/auth/google/callback`;

const googleStrategy = 
    new Strategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const providerId = profile.id;
                const provider = profile.provider;
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const avatar = profile.photos?.[0]?.value;  
                
                if (!providerId || !email) {
                console.log('Missing OAuth data:', { providerId, email, name, avatar });
                return done(AppError.badRequest('OAuth authentication failed - missing data.'), null);
                }

               const user = await authService.handleOauthLogin({ provider, providerId, email, name, avatar: { url: avatar} });

                return done(null, {user});
            } catch (error) {
                return done(error, null);
            }
        }
    );


export default googleStrategy;