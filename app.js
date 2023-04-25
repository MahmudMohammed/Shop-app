const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const session = require('express-session');
const mongodbStore = require('connect-mongodb-session')(session);
const errorController = require('./controllers/error');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const User = require('./models/user');
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.lvdzopq.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();
const store = new mongodbStore({
    uri: MONGODB_URI,
    collection: "sessions"
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    // filename: (req, file, cb) => {
    //     cb(null, file.fieldname + '-' + file.originalname);
    // }
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + file.originalname)
    }
});
const fileFilter = (req, file, cb) => {
    if(
        file.mimetype === 'image/png'  || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg'
    ) {
        cb(null, true);
    }else{
        cb(null, false);
    }
};

app.set('view engine' , 'ejs');      // using an engine that's built in in expressJS
app.set('views' , 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');



app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({storage: fileStorage , fileFilter: fileFilter  }).single('image'))
app.use(express.static(path.join(__dirname , 'public')));
app.use('/images', express.static(path.join(__dirname , 'images')));
app.use(session({
    secret: 'my secret' ,
    resave: false ,
    saveUninitialized: false,
    store: store
}));
app.use(flash());

app.use(csrfProtection);

app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})

app.use((req , res , next)=>{
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                return next();
            }
            req.user = user;
            next();
        })
        .catch(err=>{
            next(new Error(err));
        }); 
});

app.use('/admin' , adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500' , errorController.get500Page);
app.use(errorController.get404Page);

app.use((error, req, res, next) => {
    console.log(error);
    res.status(500).render('500', {
      pageTitle: 'Error!',
      path: '/500',
      isAuthenticated: req.session.isLoggedIn
    });
  });

mongoose
.connect(MONGODB_URI)
.then(result=>{
    app.listen(3000);
})
.catch(err=>{
    console.log(err);
});