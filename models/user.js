const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email:{
        type: String,
        required: true
    },
    
    password:{
        type: String,
        required: true
    },

    resetToken: String,

    resetTokenExpiration: Date,

    cart:{
        items: [{
            productId:{ type: Schema.Types.ObjectId , required: true , ref: 'Product' } , 
            quantity: { type: Number , required: true } 
        }]
    },
});
userSchema.methods.addToCart = function(product){
    const cartProductIndex = this.cart.items.findIndex(cb=>{
        return cb.productId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItem = [...this.cart.items]

    if(cartProductIndex >=0){
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItem[cartProductIndex].quantity = newQuantity;
    }else{
        updatedCartItem.push({
            productId: product._id ,
            quantity: newQuantity
        });
    }
    const updatedCart = { 
        items: updatedCartItem 
    };
    this.cart = updatedCart;
    return this.save();
}
userSchema.methods.removeFromCart = function(productId){
    const updatedCartItem = this.cart.items.filter(item=>{
        return item.productId.toString() !== productId.toString();
    });
    this.cart.items = updatedCartItem;
    return this.save();
};
userSchema.methods.clearCart = function(){
    this.cart = {items:[]}
    return this.save();
};
module.exports = mongoose.model('User' , userSchema);