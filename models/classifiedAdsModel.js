const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const classifiedAdSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
    },
    productName: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    imgUrls: {
        type: Array,
        required: true,
    },
    expires: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    ownerName: {
        type: String,
        required: true,
    },
    product_url: {
        type: String,
        required: true,
    },
    hasExpired: {
        type: Boolean,
        default: false,
    },
    timesToPost: {
        type: Number,
        required: true,
    },
    timesPostedToday: {
        type: Number,
        default: 0,

    },
    hourPosted: {
        type: Number,
        default: 0,
    },
    paid: {
        type: Number,
        default: 0,
    },
    price: {
        type: Number,
        default: 0,
    },
    number: {
        type: Number,
        default: 0,
    },
    is_market: {
        type: Boolean,
        default: false,
    },
    is_pet: {
        type: Boolean,
        default: false,
    },
    is_service: {
        type: Boolean,
        default: false,
    },
    is_promo: {
        type: Boolean,
        default: true,
    },
    currentDate: {
        type: Date,
        default: Date.now(), // Set the default value to the current date
    },
}, { timestamps: true });

const classifiedAds = mongoose.model("classifiedAds", classifiedAdSchema);
module.exports = classifiedAds;

