const mongoose = require("mongoose");

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

    paid: {
        type: Number,
        default: 0,
    },
    currentDate: {
        type: Date,
        default: Date.now(), // Set the default value to the current date
    },
    imageUrls: {
        type: Array,
        required: true,
    },
    publicIds: {
        type: Array,
        required: true,
    },
    pages: {
        type: Number,
        required: true,
    },
});

const Ad = mongoose.model("ads", adSchema);
module.exports = Ad;

