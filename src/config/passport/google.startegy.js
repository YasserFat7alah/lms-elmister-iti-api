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
                const { id, displayName, emails, photos } = profile;
                const email = emails?.[0]?.value;
                const avatar = photos?.[0]?.value;

                if (!email) return done(AppError.badRequest('No email found in Google profile data'), null);  

               const user = await authService.handleOauthLogin({ provider: 'google', providerId: id, email, name: displayName, avatar });

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    );


export default googleStrategy;