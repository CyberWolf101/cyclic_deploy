const mongoose = require('mongoose');

const acceptedBidSchema = new mongoose.Schema({
    auctionID: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    email_of_bider: {
        type: String,
        required: true,
    },
    id_of_bider: {
        type: String,
        required: true,
    },
    name_of_bider: {
        type: String,
        required: true,
    },
    email_of_auctioner: {
        type: String,
        required: true,
    },
    number_of_auctioner: {
        type: Number,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    number_of_bider: {
        type: Number,
        required: true,
    },
    time_of_acceptance: {
        type: Number,
        required: true,
    },
    product_url: {
        type: String,
        required: true,
    },
    product_url1: {
        type: String,
        default: '',
    },

    id_of_auctioner: {
        type: String,
        default: false,
    },
    hasPaid: {
        type: Boolean
    },
});

const AcceptedBid = mongoose.model('AcceptedBid', acceptedBidSchema);

module.exports = AcceptedBid;
