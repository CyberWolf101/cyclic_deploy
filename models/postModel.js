const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    link: {
        type: String,
    },
    imgUrl: {
        type: String,
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
    currentDate: {
        type: Date,
        default: Date.now(), // Set the default value to the current date
    },
});

const Ad = mongoose.model("ads", adSchema);
module.exports = Ad;

