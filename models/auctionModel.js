const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: String,
  auctionId: String,
  created_at: Number,
  product_id: String,
  amount: Number,
  categories: [String],
  endDate: Number,
  price: Number,
  offPrice: Number,
  auctionPrice: Number,
  description: String,
  shop: String,
  product_url: String,
  auctionType: String,
  imageUrls: [String],
  publicIds: [String],
  product_url1: String,
  product_url2: String,
  product_url3: String,
  parent_Product_Id: String,
  isOutOfStock: Boolean,
  isAuctioned: {
    type: Boolean,
    default: false,
  },
  isPromoted: {
    type: Boolean,
    default: false,
  },
  promotEnd: {
    type: Number,
    default: 0,
  },
  promorStart: {
    type: Number,
    default: 0,
  },
  promoStart: Number,
  sizes: {
    type: Object,
    required: true,
    default: {},
  },
  subAdminID: String,
  shopID: String,
  discountPrice: Number,
  keyFeatures: {
    type: Array,
    default: [],
  },
  variations: {
    type: Array,
    default: [],
  },

  numericSizeObject: {
    type: Object,
    required: true,
    default: {},
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
