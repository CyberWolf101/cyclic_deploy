const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
    },
    date: {
        type: Number,
        required: true,
    },
    paymentID: {
        type: String,
        required: true,
    },
    auctionId: {
        type: String,
        required: true,
    },
    seller_id: {
        type: String,
        required: true,
    },

    shippingFee: {
        type: Number,
        required: true,
    },
    purchased_product: {
        type: Object,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    customer: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    userID: {
        type: String,
        required: true,
    },
    absoluteAddress: {
        type: String,
        required: true,
    },
    is_auction: {
        type: Boolean,
        required: true,
    },

    total: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    shop: {
        type: String,
        default: '',
    },
    product_id: {
        type: String,
        required: true
    },
    reason_for_cancel: {
        type: String,
    },
    accountName: {
        type: String,
    },
    accountNumber: {
        type: Number,
    },
    cancelDate: {
        type: Number,
    },
    bank: {
        type: String,
    },
    order_is_canceled: {
        type: Boolean,
        default: false,
    },

    canAccept: {
        type: Boolean,
        default: true,
    },
    deliveredOn: {
        type: Number,
    },
    auctionId: {
        type: String,
    },
    not_visible: {
        type: Boolean,
    },
    user_that_paid_id: {
        type: String,
    },
    auction_Item_Paid_For: {
        type: String,
    },
    amountPaid_by_user: {
        type: String,
    },
    hasPaid: {
        type: String,
    },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
