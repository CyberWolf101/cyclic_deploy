const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const pendingDeliveryPaymentsSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    product_id: {
        type: String,
        required: true,
    },
    seller_id: {
        type: String,
        required: true,
    },
    date: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
});

const PendingDeliveryPayments = mongoose.model("pendingDeliveryPayments", pendingDeliveryPaymentsSchema);
module.exports = PendingDeliveryPayments;

