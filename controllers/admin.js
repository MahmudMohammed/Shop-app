const Product = require('../models/product')
const fileHelper = require('../util/file')
const { validationResult } = require('express-validator')


exports.getAddProducts = (req,res,next)=>{
    res.render('admin/edit-product' , {
        pageTitle: 'Add-Product' ,
        path: '/admin/add-product' , 
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProducts = (req,res,next)=>{
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    
    if(!image){
        return res.status(422).render('admin/edit-product' , {
            pageTitle: 'Add-Product' ,
            path: '/admin/add-product' ,
            editing: false ,
            hasError: true,
            product: {
                title: title ,
                price: price,
                description: description 
            },
            errorMessage: 'Attached file is not an image',
            validationErrors: []
        })
    }

    const error = validationResult(req);
    
    if(!error.isEmpty()){
        return res.status(422).render('admin/edit-product' , {
            pageTitle: 'Add-Product' ,
            path: '/admin/add-product' ,
            editing: false ,
            hasError: true,
            product: {
                title: title ,
                price: price,
                description: description 
            },
            errorMessage: error.array()[0].msg,
            validationErrors: error.array()
        })
    }

    const imageUrl = image.path;

    const product = new Product({
        title: title ,
        price: price ,
        description: description ,
        imageUrl: imageUrl,
        userId: req.user
    });
    product
        .save()
        .then(result=>{
            res.redirect('/admin/products');
        })
        .catch(err => {
            // return res.status(500).render('admin/edit-product', {
            //   pageTitle: 'Add Product',
            //   path: '/admin/add-product',
            //   editing: false,
            //   hasError: true,
            //   product: {
            //     title: title,
            //     imageUrl: imageUrl,
            //     price: price,
            //     description: description
            //   },
            //   errorMessage: 'Database operation failed, please try again.',
            //   validationErrors: []
            // });
            // res.redirect('/500');
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProducts = (req,res,next)=>{
    const editMode = req.query.edit;
    if(!editMode){
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then((product)=>{
        if(!product){
            return res.redirect('/');
        }
        res.render('admin/edit-product' , {
            pageTitle: 'Edit-Product' ,
            path: '/admin/edit-product' ,
            editing: editMode ,
            product: product,
            hasError: false,
            errorMessage: null,       
            validationErrors: []

        })
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postEditProduct = (req , res ,next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDes = req.body.description;
    
    const error = validationResult(req);
    
    console.log(error);
    if(!error.isEmpty()){
        return res.status(422).render('admin/edit-product' , {
            pageTitle: 'Edit-Product' ,
            path: '/admin/edit-product' ,
            editing: true ,
            hasError: true,
            product: {
                title: updatedTitle ,
                price: updatedPrice,
                description: updatedDes,
                _id: prodId
            },
            errorMessage: error.array()[0].msg,
            validationErrors: error.array()
        })
    }
    Product.findById(prodId)
    .then(product=>{
        console.log(product)
        if(product.userId.toString() !== req.user._id.toString()){
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDes;
        if(image){
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = image.path;
        }
        return product.save().then(result=>{
            console.log('UPDATED PRODUCT !');
            res.redirect('/admin/products');
        }) 
    })

    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getProducts = (req,res,next) => {
    Product.find({userId: req.user._id})
    // .populate('userId')
    .then(products=>{
        res.render('admin/products' , { 
            prods: products ,
            pageTitle: 'Admin Products',
            path: '/admin/products',
        });
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};
exports.deleteProduct = (req,res,next) =>{
    const prodId = req.params.productId;

    Product.findById(prodId)
        .then(product=>{
            if(!product){
                return next(new Error('Product not found'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne({_id: prodId , userId: req.user._id});
        })
        .then(()=>{
            console.log('PRODUCT DELETED');
            res.status(200).json({ message: 'Success!'})
        })
        .catch(err=>{
            res.status(500).json({ message:'Deleting product failed'})
        });
}
// exports.postDeleteProduct = (req,res,next) =>{
//     const prodId = req.body.productId;

//     Product.findById(prodId)
//         .then(product=>{
//             if(!product){
//                 return next(new Error('Product not found'));
//             }
//             fileHelper.deleteFile(product.imageUrl);
//             return Product.deleteOne({_id: prodId , userId: req.user._id});
//         })
//         .then(()=>{
//             console.log('PRODUCT DELETED');
//             res.redirect('/admin/products')
//         })
//         .catch(err=>{
//             const error = new Error(err);
//             error.httpStatusCode = 500;
//             return next(error);
//         });
// }
