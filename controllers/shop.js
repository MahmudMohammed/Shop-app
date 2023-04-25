const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const Product = require('../models/product')
const Order = require('../models/order');
const PDFDocument = require('pdfkit');

const ITEM_PER_PAGE = 2;


exports.getProducts = (req,res,next)=>{
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find().skip((page - 1) * ITEM_PER_PAGE)
            .limit(ITEM_PER_PAGE);
        })
        .then(products =>{
            res.render('shop/product-list' , {
                prods: products ,
                pageTitle: 'Products',
                path: '/products',
                currentPage: page,
                hasNextPage: ITEM_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil( totalItems / ITEM_PER_PAGE )
            });
        })
        .catch(err=>{
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getProduct = (req,res,next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then((product)=>{
        res.render('shop/product-detail',{
            product: product, 
            pageTitle: product.title , 
            path:'/products'
        })
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};
exports.getIndex = (req,res,next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find().skip((page - 1) * ITEM_PER_PAGE)
            .limit(ITEM_PER_PAGE);
        })
        .then(products =>{
            res.render('shop/index' , {
                prods: products ,
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: ITEM_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil( totalItems / ITEM_PER_PAGE )
            });
        })
        .catch(err=>{
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getCart = (req,res,next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart' ,{
                pageTitle: 'Your Cart',
                path: '/cart',
                products: products,
            });
        })
        .catch(err=>{
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.postCart = (req,res,next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product=>{
            return req.user.addToCart(product);
        })
        .then(result=>{
            // console.log(result);
            res.redirect('/cart');
        })
        .catch(err=>{
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.postCartDelete = (req,res,next) => {
   const prodId = req.body.productId;
   req.user
    .removeFromCart(prodId)
    .then(result =>{
        res.redirect('/cart');
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}
exports.getOrders = (req,res,next) => {
    Order.find({'user.userId': req.user._id})
        .then(orders=>{
            res.render('shop/orders',{
                pageTitle: "Your Orders",
                path: '/orders',
                orders: orders,
                
            });
        })
        .catch(err=>{
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getCheckout = (req,res,next) =>{
    res.render('shop/checkout' , 
    {pageTitle: 'Checkout',
    path: '/checkout'
});
};
exports.getCheckout = (req,res,next) =>{
    let products;
    let total = 0;
    req.user
    .populate('cart.items.productId')
    .then(user => {
        products = user.cart.items;
        total = 0;
        products.forEach(product =>{
            total += product.quantity * product.productId.price;
        });

        return stripe.checkout.sessions.create({
            payment_method_types: ['card'] ,
            line_items: products.map(p =>{
                return {
                    price_data: {
                      currency: 'usd',
                      unit_amount: p.productId.price * 100,
                      product_data: {
                        name: p.productId.title,
                        description: p.productId.description,
                      },
                    },
                    quantity: p.quantity
                  };
            }),
            mode: 'payment',
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success' ,
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })
        .then(session=>{
            res.render('shop/checkout' ,{
                pageTitle: 'Checkout',
                path: '/checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })

    })
    .catch(err=>{
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}
exports.postOrder = (req,res,next) =>{
    req.user
    .populate('cart.items.productId')
    .then(user =>{
        const products = user.cart.items.map(i =>{
            return {quantity: i.quantity , product: { ...i.productId._doc }}
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result=>{
        return req.user.clearCart();
    })    
    .then(result=>{
        res.redirect('/orders');
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};
exports.getInvoice = (req, res ,next) =>{
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order=>{
            if(!order){
                return next(new Error('No order found !'));
            }
            if(order.user.userId.toString() !== req.user._id.toString()){
                return next(new Error('You are not authorized to view this order'));
            }
            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data' , 'invoices', invoiceName);

            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inLine; filename="' + invoiceName + '"');
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text('invoice',{ underline: true });
            let totalPrice = 0;
            order.products.forEach(product =>{
                pdfDoc.fontSize(16).text(product.product.title + '----' +  product.quantity +' X '+ '$' + product.product.price );
                totalPrice += product.product.price * product.quantity;
            });
            pdfDoc.fontSize(20).text('Total Price : $ ' + totalPrice, { underline: true });
            pdfDoc.end();

            // fs.readFile(invoicePath , (err , data)=>{
            //     if(err){
            //         return next(err);
            //     }
            //     res.setHeader('Content-Type', 'application/pdf');
            //     res.setHeader('Content-Disposition', 'inLine; filename="' + invoiceName + '"');
            //     res.send(data);
            // })
            // const file = fs.createReadStream(invoicePath);
            // file.pipe(res);

        })
        .catch(err=>{
            next(err);
        });

}
exports.getCheckoutSuccess = (req, res) => {
    req.user
    .populate('cart.items.productId')
    .then(user =>{
        const products = user.cart.items.map(i =>{
            return {quantity: i.quantity , product: { ...i.productId._doc }}
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result=>{
        return req.user.clearCart();
    })    
    .then(result=>{
        res.redirect('/orders');
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}