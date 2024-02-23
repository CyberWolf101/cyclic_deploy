const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  created_at: {
    type: Number,
    required: true,
  },
  product_id: {
    type: String,
    required: true,
  },
  auctionId: {
    type: String,
    required: true,
  },
  acceptedFor: {
    type: String,
    default: ''
  },

  accepted_amount: {
    type: Number,
  },

  categories: {
    type: [String],
    required: true,
  },
  auctioner_email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  userID: {
    type: String,
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
  product_url2: {
    type: String,
    default: '',
  },
  product_url3: {
    type: String,
    default: '',
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  bids: {
    type: Number,
    default: 0,
  },
  highestBid: {
    type: Number,
    default: 0,
  },
  biders: {
    type: [],
    default: [],
  },
  publicIds: {
    type: [],
    default: [],
  },
  images: {
    type: [],
    default: [],
  },
  canAccept: {
    type: Boolean,
    default: true,
  },
  endDate: {
    type: Number,
    required: true,
  },
  auctionType: {
    type: String,
    required: true,
  },
  auctionId: {
    type: String,
  },
  parent_Product_Id: {
    type: String,
  },
  not_visible: {
    type: Boolean,
    default: false
  },
  user_that_paid_id: {
    type: String,
  },
  auction_Item_Paid_For: {
    type: String,
  },
  amountPaid_by_user: {
    type: Number,
  },
  hasPaid: {
    type: Boolean
  },
  isUserAuction: {
    type: Boolean
  },
  auctionerPhone: {
    type: String
  }
});

const Auction = mongoose.model('Auction', auctionSchema);

module.exports = Auction;
