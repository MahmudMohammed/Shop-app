const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');


router.get('/add-product' , isAuth , adminController.getAddProducts);

router.get('/products' , isAuth ,adminController.getProducts); 

router.post('/add-product' , isAuth , 
[
    body('title')
        .isString()
        .isLength({min: 3})
        .trim(),
    body('price')
        .isFloat(),
    body('description')        
        .isLength({min: 5 , max: 400})
        .trim()
] 
, adminController.postAddProducts);  

router.get('/edit-product/:productId' , isAuth ,adminController.getEditProducts);

router.post('/edit-product' , isAuth , 
[
    body('title')
        .isString()
        .isLength({min: 3})
        .trim(),

    body('price').isFloat(),
    
    body('description')        
        .isLength({min: 5 , max: 400})
        .trim()
]  
,  adminController.postEditProduct); 

// router.post('/delete-product' , isAuth , adminController.postDeleteProduct);
router.delete('/product/:productId' , isAuth , adminController.deleteProduct);


module.exports = router;

