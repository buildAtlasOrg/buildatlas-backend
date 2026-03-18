require(dotenv).config();
const express = require("express");
const router = express.Router();
const passport = require("passport");
const GitHubStrategy = require("passport-github").Strategy;

const app = express();

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie:{
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            sameSite: "lax"
        }
    })
)

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});
//Github OAuth Strategy
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL
        },
        function verify(accessToken, refreshToken, profile, done) {
            return done(null, {
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                photos: profile.photos
            });
        }
    )
);

//home page

app.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.send(`
            <h1>Hello ${req.user.username}</h1>
            <p>You are signed in with GitHub.</p>
            <p><a href="/profile">Profile</a></p>
            <p><a href="/logout">Logout</a></p>
        `);
    }
    res.send('<h1>Welcome</h1><p><a href="/auth/github">Login with GitHub</a></p>');
});


//start github login

app.get(
    '/auth/github',
    passport.authenticate('github',{scope['user.email']})
);

//github callback

app.get(
    '/auth/github/callback',
    passport.authenticate('github',{
        failureRedirect:'/login-failed',
    }),
    (req,res)=>{
        res.redirect('/profile');
    }
);



//protected route

function ensureAuth(req,res,next){
    if(req.isAuthenticated )
}