const express = require('express');
const router = express.Router();
const User = require('../models/user')
const authController = require('../controllers/auth');
const { check , body } = require('express-validator');

router.get('/login' , authController.getLogin);

router.get('/signup' , authController.getSignup);

router.post('/login' ,  
[
    body('email')
        .isEmail()
        .withMessage('Please entre a valid email address.')
        .normalizeEmail(),
    body('password' , 'Password has to be valid.')
        .isLength({min: 5})
        .isAlphanumeric()
        .trim()   
] , 
authController.postLogin);

router.post('/logout' , authController.postLogout);

router.post('/signup' , 
[    check('email')
        .isEmail()
        .withMessage('Please Entre a valid E-mail')
        .custom((value , {req})=>{
            // if(value === 'test@test.com'){
            //     throw new Error('This Email address isnot valid ')
            // }
            // return true;

            return User.findOne({email : value})
            .then(userDoc=>{
                if(userDoc){
                    return Promise.reject('E-mail exists aleardy ,please pick a different one.');
                } 
            });
            
        })
        .normalizeEmail(), 

    body('password' , 'Please Entre a password with only numbersand text and at least 5 characters')
        .isLength({min: 5})
        .isAlphanumeric()
        .trim() ,

    body('confirmPassword')
        .trim()
        .custom((value , {req}) => {
            if(value !== req.body.password){
                throw new Error('Password have to match')
            }
            return true;
        })
],
authController.postSignup);

router.get('/reset' , authController.getReset);

router.post('/reset' , authController.postReset);

// router.get('/reset/:token' , authController.getNewPassword);
// router.post('/new-password' , authController.postNewPassword);





module.exports = router;