const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const mongoose = require("mongoose");
const cors = require("cors");
const Fuse = require('fuse.js');
const app = express();
const port = 3000;
app.use(express.json());
app.use(express.static('public'));
const router = express.Router()
require("dotenv").config()
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Ad = require('./models/postModel')
const Product = require('./models/productModal')
const Auction = require('./models/auctionModel')
const AcceptedBid = require('./models/acceptedBidModel')
const Order = require('./models/orderModel')
const posRouter = require('./Routes/pos');
const classifedRouter = require('./Routes/classified')
app.use(cors());


mongoose.connect(process.env.DATAURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Data-base connected & listening on port", process.env.PORT + "...")
    });
  }).catch((err) => {
    console.log(err.message)
  })

app.set("view engine", "ejs")
app.use(express.static("public"))


cloudinary.config({
  cloud_name: 'dfdnuay65',
  api_key: '845648699234787',
  api_secret: '9MzfyKj2021VjQuzqEuunAsk19o',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'ads-pics',
  allowedFormats: ['jpg', 'png', 'jpeg'],
});
const upload = multer({ storage: storage });



app.use("/classified", classifedRouter);

router.get('/', async (req, res) => {
  res.json({ mssg: 'hello' })
})



router.get('/all-orders', async (req, res) => {
  try {
    const allOrders = await Order.find(); // Await the query execution
    res.status(200).json({ success: true, orders: allOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message }); // Send error message
  }
});

router.put('/approve-order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const theOrder = await Order.findOneAndUpdate(
      { _id: orderId }, // Use _id for finding the order
      { status: 'delivered', deliveredOn: Date.now() },
      { new: true }
    );

    // No need to call save(), as findOneAndUpdate updates the document directly
    res.status(200).json({ success: true, order: theOrder }); // Use 'order' instead of 'orders'
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/repost-auction/:id/:parentId', async (req, res) => {
  const { id, parentId } = req.params;

  try {
    const currentDate = new Date();
    const nextSevenDays = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));

    const theAuction = await Auction.findOneAndUpdate(
      { auctionId: id },
      { endDate: nextSevenDays },
      { new: true }
    );

    const theProduct = await Product.findOneAndUpdate(
      { product_id: parentId },
      { endDate: nextSevenDays },
      { new: true }
    );

    res.status(200).json({ success: true, auction: theAuction, product: theProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.put('/repost-user-auction/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const currentDate = new Date();
    const nextSevenDays = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));

    const theAuction = await Auction.findOneAndUpdate(
      { auctionId: id },
      { endDate: nextSevenDays },
      { new: true }
    );


    res.status(200).json({ success: true, auction: theAuction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/paymentMade', async (req, res) => {
  try {
    const {
      price,
      cartStingified,
      userStingified,
      id,
      shippingFee,
      amount
    } = req.body; // Assuming the request body contains price and cart details

    const user = JSON.parse(userStingified)
    const cart = JSON.parse(cartStingified)

    const promises = cart.map(async (item) => {
      // Other calculations for deductedAmount, quantityPrice, etc. need to be adapted here.

      const orderData = {
        userID: user.id,
        purchased_product: item,
        product_id: item.product_id,
        date: Date.now(),
        shop: item.shop,
        status: 'pending',
        shippingFee: shippingFee,
        subtotal: price,
        total: amount,
        absoluteAddress: user?.valueOfstate + ", " + user?.valueOfcity + ", " + user?.streeAddress,
        phone: user?.phone,
        customer: user?.name + " " + user?.surename,
        email: user?.email,
        seller_id: item.subAdminID,
        paymentID: id,
        is_auction: false
      };

      // Save the order data to MongoDB using Mongoose
      const newOrder = new Order(orderData);
      await newOrder.save();

      // Return the order data in the response if needed
      return orderData;
    });

    await Promise.all(promises);

    res.status(200).json({ success: true, message: 'Orders created successfully' });
  } catch (error) {
    console.error('Error creating orders:', error);
    res.status(500).json({ success: false, error: error });
  }
});


router.put('/cancel-order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      text,
      accountName,
      accountNumber,
      bank,
    } = req.body;

    const updatedOder = await Order.findByIdAndUpdate(
      { _id: id },
      {
        reason_for_cancel: text,
        order_is_canceled: true,
        status: 'canceled',
        accountName,
        accountNumber,
        bank,
        cancelDate: Date.now()
      },
      { new: true }

    );



    res.status(200).json({ updatedDoc: updatedOder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});


router.post('/placeAuctionOrder', async (req, res) => {
  try {
    const {
      userStringified,
      auctionStringified,
      itemID,
      is_auction,
      shop,
      shippingFee,
    } = req.body;

    const auction = JSON.parse(auctionStringified)
    const user = JSON.parse(userStringified)
    let pricePaid
    if (auction.accepted_amount) {
      pricePaid = auction.accepted_amount
    } else {
      pricePaid = auction.price
    }
    if (!user) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const newOrder = new Order({
      userID: user.id,
      purchased_product: auction,
      product_id: auction.product_id,
      date: Date.now(),
      shop: shop,
      status: 'pending',
      shippingFee: shippingFee,
      // subtotal: auction.amountPaid_by_user,
      subtotal: pricePaid,
      // total: auction.amountPaid_by_user,
      total: pricePaid,
      absoluteAddress: user?.valueOfstate + ", " + user?.valueOfcity + ", " + user?.streeAddress,
      phone: user?.phone,
      customer: user?.name + " " + user?.surename,
      email: user?.email,
      seller_id: auction.userID,
      paymentID: itemID,
      is_auction: is_auction
    });

    await newOrder.save();
    await Auction.findOneAndUpdate(
      { auctionId: auction.auctionId },
      { not_visible: true }
    );


    // Add your email sending logic here

    res.status(200).json({ success: true, updatedDoc: newOrder });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getUserOrders/:userID', async (req, res) => {
  const { userID } = req.params;

  try {
    // Use the find method to retrieve products with a specific "shop" value
    const orders = await Order.find({ userID });

    // Send the products as a JSON response
    res.json(orders);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Handle errors and send an appropriate response
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/getShopOrders/:seller_id', async (req, res) => {
  const { seller_id } = req.params;

  try {
    // Use the find method to retrieve products with a specific "shop" value
    const orders = await Order.find({ seller_id });

    // Send the products as a JSON response
    res.json(orders);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Handle errors and send an appropriate response
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/getSingleOrder/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Use the find method to retrieve products with a specific "shop" value
    const order = await Order.findById({ _id: id });

    // Send the products as a JSON response
    res.json(order);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Handle errors and send an appropriate response
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/products/:shop', async (req, res) => {
  const { shop } = req.params;

  try {
    // Use the find method to retrieve products with a specific "shop" value
    const products = await Product.find({ shop: shop });

    // Send the products as a JSON response
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Handle errors and send an appropriate response
    res.status(500).json({ error: 'Internal Server Error' });
  }
});






// _________SEARCH QUERY_________\\

async function getAllProducts() {
  try {
    const products = await Product.find();
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Create a Fuse instance with the products and desired options
// Create a Fuse instance with the products and desired options
let fuse;

async function initializeFuse() {
  try {
    const allProducts = await getAllProducts();

    const fuseOptions = {
      keys: ['productName', 'description', 'shop', 'categories'],
      threshold: 0.6, // Adjust as needed
    };

    fuse = new Fuse(allProducts, fuseOptions);
  } catch (error) {
    console.error('Error initializing Fuse:', error);
  }
}

// Initialize the Fuse instance
initializeFuse();

// Search endpoint
// Helper function to get a unique identifier for a product
const getProductId = (product) => {
  return product._id || (product.item && product.item._id) || JSON.stringify(product);
};
router.post('/search', async (req, res) => {
  const { query } = req.body;

  // Ensure Fuse is initialized before proceeding
  if (!fuse) {
    await initializeFuse();
  }

  // Perform searches without duplicates
  const regularResults = await Product.find({ productName: { $regex: new RegExp(query, 'i') } });
  const arrayResults = await Product.find({ categories: { $in: query } });
  const fuzzyResults = fuse.search(query);

  // Combine all results (without duplicates within each segment)
  const combinedResults = [...regularResults, ...arrayResults, ...fuzzyResults];

  // Use a Set to keep track of unique product IDs
  const uniqueProductIds = new Set();

  // Filter results to keep only unique items based on their unique identifier
  const deduplicatedResults = combinedResults.filter(result => {
    const productId = getProductId(result);
    if (!uniqueProductIds.has(productId)) {
      uniqueProductIds.add(productId);
      return true;
    }
    return false;
  });

  res.json({ results: deduplicatedResults });
});

router.post('/advancedSearch1', async (req, res) => {
  try {
    const { category, subcategory } = req.body;

    const products = await getAllProducts();

    // Function within the route (no changes needed here)
    function splitKeywords(str) {
      return str.toLowerCase().split(/[\s&]+/);
    }
    let keywords
    function advancedSearch(products, category, subcategory) {
      keywords = splitKeywords(category).concat(splitKeywords(subcategory));

      // Create a Fuse instance for each keyword
      const fuseResults = keywords.map(keyword => {
        const fuse = new Fuse(products, {
          keys: ['categories', 'productName'],
          threshold: 0.4,
        });

        return fuse.search(keyword);
      });

      // Flatten the nested arrays of results
      const flattenedResults = fuseResults.flat();

      // Filter out duplicate results
      const uniqueResults = [...new Set(flattenedResults.map(result => result.item))];

      return uniqueResults;
    }

    // Perform search using the updated function
    const matchingProducts = advancedSearch(products, category, subcategory);

    res.json({ data: matchingProducts, keywords: keywords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/getAds/:userID', async (req, res) => {
  try {
    const { userID } = req.params;

    // Fetch ads with the specified userID
    const ads = await Ad.find({ userID });

    res.status(200).json(ads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// _________PROMOTED PRODUCTS & SHUFFLE_________\\

router.get('/getPromotedProducts', async (req, res) => {
  try {
    // Get the current timestamp
    const currentDate = Date.now();

    // Find promoted products with endDate greater than current date
    const promotedProducts = await Product.find({
      isPromoted: true,
      promotEnd: { $gt: currentDate },
    });

    // Shuffle the array to get a random order
    const shuffledProducts = shuffleArray(promotedProducts);

    res.json(shuffledProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getRandomPromotedProducts', async (req, res) => {
  try {
    // Get the current timestamp
    const currentDate = Date.now();

    // Find promoted products with endDate greater than current date
    const promotedProducts = await Product.find({
      isPromoted: true,
      promotEnd: { $gt: currentDate },
    });

    // Shuffle the array to get a random order
    const shuffledProducts = shuffleArray(promotedProducts);

    // Limit the result to 6 products
    const limitedProducts = shuffledProducts.slice(0, 7);

    res.json(limitedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper function to shuffle an array
function shuffleArray(array) {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}
// _________PROMOTED PRODUCTS & SHUFFLE_________\\




router.put('/deleteVariation/:productId/:variationId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const variationId = req.params.variationId;

    const existingProduct = await Product.findOne({ product_id: productId });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const variationToDeleteIndex = existingProduct.variations.findIndex(variation => variation.product_id === variationId);

    if (variationToDeleteIndex === -1) {
      return res.status(404).json({ error: 'Variation not found' });
    }

    // Get the product_url of the variation to be deleted
    const productUrlToDelete = existingProduct.variations[variationToDeleteIndex].product_url;

    // Remove the variation from the variations array
    existingProduct.variations.splice(variationToDeleteIndex, 1);

    // Save the updated product without the deleted variation
    await existingProduct.save();

    // You can handle the deletion of the image in Cloudinary based on the product_url if needed.

    res.status(200).json({ message: 'Variation deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.put('/updateVariations/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const { variations } = req.body;

    const existingProduct = await Product.findOne({ product_id: productId });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    existingProduct.variations = variations;

    await existingProduct.save();

    res.status(200).json({ message: 'Variations updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// check point
router.post('/addNewProductVariation/:productId', upload.array('images'), async (req, res) => {
  try {
    const productId = req.params.productId;

    const images = req.files;
    let imageUrls = [];
    console.log('images', images)


    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });
      console.log('Uploaded imgs')
      // Wait for all uploads to finish and collect URLs
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }
    console.log('saved sedure_url')

    const { variationsString } = req.body;
    console.log('variations', variationsString)
    const variations = JSON.parse(variationsString)

    // Fetch the existing product
    const existingProduct = await Product.findOne({ product_id: productId });

    console.log('existingProduct', existingProduct)

    const variations_with_img_url = variations.map((variant, index) => ({
      ...variant,
      product_url: imageUrls[index],
      keyFeatures: '',
      isVariation: true,
      parentID: existingProduct.product_id,
      amount: 1,
      isOutOfStock: false,
      productName: existingProduct.productName + variant.variation,
      product_id: Date.now() + Math.random(),
      type: variant.variation,
      subAdminID: existingProduct.subAdminID
    }));



    existingProduct.variations = variations_with_img_url;

    console.log('variations_with_img_url', variations_with_img_url)
    console.log('existingProduct variations', existingProduct.variations)

    await existingProduct.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/addColorNPriceVariations/:productId', upload.array('images'), async (req, res) => {
  try {
    const productId = req.params.productId;

    const images = req.files;
    let imageUrls = [];

    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });
      console.log('Uploaded imgs')
      // Wait for all uploads to finish and collect URLs
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }
    console.log('saved sedure_url')

    const { additionalName1, additionalName2, additionalName3, id, price1, price2, price3 } = req.body;

    // Fetch the existing product
    const existingProduct = await Product.findOne({ product_id: productId });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log('Product found')

    let currentVariations = existingProduct?.variations;

    // Push variations
    if (imageUrls[0] && price1) {
      currentVariations.push({
        product_url: imageUrls[0],
        keyFeatures: '',
        price: Number(price1),
        discountPrice: Number(price1),
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName1}`,
        product_id: `123${id}`,
        type: additionalName1,
        subAdminID: existingProduct.subAdminID,
      });
      console.log('Pushed 1')
    }

    if (imageUrls[1] && price2) {
      currentVariations.push({
        product_url: imageUrls[1],
        keyFeatures: '',
        price: Number(price2),
        discountPrice: Number(price2),
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName2}`,
        product_id: `212${id}`,
        type: additionalName2,
        subAdminID: existingProduct.subAdminID,
      });
      console.log('Pushed 2')
    }

    if (imageUrls[2] && price3) {
      currentVariations.push({
        product_url: imageUrls[2],
        keyFeatures: '',
        price: Number(price3),
        discountPrice: Number(price3),
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName3}`,
        product_id: `313${id}`,
        type: additionalName3,
        subAdminID: existingProduct.subAdminID,
      });
      console.log('Pushed 3')

    }

    // Save the updated product with variations
    await existingProduct.save();
    console.log('Saved')

    res.status(200).json({ message: 'Color & price variants added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.post('/addVariations/:productId', upload.array('images'), async (req, res) => {
  try {
    const productId = req.params.productId;

    const images = req.files;
    let imageUrls = [];

    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });
      console.log('image uploaded')
      // Wait for all uploads to finish and collect URLs
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    const { additionalName1, additionalName2, additionalName3, id, price } = req.body;
    console.log('Gottten from req body')


    // Fetch the existing product
    const existingProduct = await Product.findOne({ product_id: productId });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log('found product')
    let PriceType;
    if (Number(existingProduct.price) > 0) {
      PriceType = existingProduct.price
    } else if (existingProduct.sizes && Object.keys(existingProduct.sizes).length > 0) {
      PriceType = existingProduct.sizes
    } else if (existingProduct.numericSizeObject && Object.keys(existingProduct.numericSizeObject).length > 0) {
      PriceType = existingProduct.numericSizeObject
    } else {
      res.status(500).json({ error: 'could not find price' });
      return
    }
    console.log('Price established', PriceType)

    // Add variations to the existing product
    if (additionalName1) {
      existingProduct.variations.push({
        product_url: imageUrls[0],
        keyFeatures: '',
        price: PriceType,
        discountPrice: PriceType,
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName1}`,
        product_id: id + '123',
        type: additionalName1,
        subAdminID: existingProduct.subAdminID,
      });
    }
    console.log('pushed 1')


    if (additionalName2) {
      existingProduct.variations.push({
        product_url: imageUrls[1],
        keyFeatures: '',
        price: PriceType,
        discountPrice: PriceType,
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName2}`,
        product_id: id + '132',
        type: additionalName2,
        subAdminID: existingProduct.subAdminID,
      });
    }
    console.log('pushed 2')

    if (additionalName3) {
      existingProduct.variations.push({
        product_url: imageUrls[2],
        keyFeatures: '',
        price: PriceType,
        discountPrice: PriceType,
        isVariation: true,
        parentID: productId,
        amount: 1,
        isOutOfStock: false,
        productName: `${existingProduct.productName} ${additionalName3}`,
        product_id: id + '293',
        type: additionalName3,
        subAdminID: existingProduct.subAdminID,
      });
    }
    console.log('pushed 3')

    // Save the updated product with variations
    await existingProduct.save();
    console.log('saved')

    res.status(200).json({ message: 'Variations added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.get('/getSingleAuction/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findOne({ auctionId: auctionId });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.status(200).json({ auction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




//placeBid route
router.post('/placeBid', async (req, res) => {
  try {
    const { item, bidAmount, userDetails } = req.body;

    if (!userDetails) {
      return res.status(400).json({ error: 'User not authenticated' });
    }


    const newBidder = {
      userID: userDetails.id,
      amount: Number(bidAmount),
      email: userDetails.email,
      phone: userDetails?.phone,
      name: userDetails?.name + ' ' + userDetails?.surename,
      timeOfBid: Date.now(),
    };

    console.log('______ITEM___________', item)
    const updatedAuction = await Auction.findOneAndUpdate(
      { auctionId: item.auctionId },
      {
        $push: { biders: newBidder },
        $inc: { bids: 1 },
        $set: { lastBid: Date.now() },
        $set: { highestBid: Number(bidAmount) }
      },
      { new: true }
    );


    // Add your email sending logic here

    console.log('Success: Bid placed successfully!');
    res.status(200).json({ message: 'Bid placed successfully', updatedAuction: updatedAuction });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getAuction/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;



    const auction = await Auction.findOne({ auctionId });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.status(200).json({ auction });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.delete('/deleteAuctionAndUpdateProduct/:auctionId/:productId', async (req, res) => {
  try {
    const { auctionId, productId } = req.params;

    // Delete auction
    const deletedAuction = await Auction.findOneAndDelete({ auctionId });

    if (!deletedAuction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Update product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      { isAuctioned: false },
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ deletedAuction, updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.delete('/deleteAuction/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Delete auction
    const deletedAuction = await Auction.findOneAndDelete({ auctionId });

    if (!deletedAuction) {
      return res.status(404).json({ error: 'Auction not found' });
    }


    res.status(200).json({ deletedAuction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.delete('/deleteAuctionAndUpdateProduct/:auctionId/:productId', async (req, res) => {
  try {
    const { auctionId, productId } = req.params;

    // Delete auction
    const deletedAuction = await Auction.findOneAndDelete({ auctionId });

    if (!deletedAuction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Update product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      { isAuctioned: false },
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ deletedAuction, updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.put('/updateAuctionAndProductForUser/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { price, auctionType } = req.body;


    const updatedAuction = await Auction.findOneAndUpdate(
      { auctionId },
      { price: Number(price), auctionType },
      { new: true } // Return the updated document

    );


    res.status(200).json({ updatedAuction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.put('/updateAuctionAndProduct/:auctionId/:productId', async (req, res) => {
  try {
    const { auctionId, productId } = req.params;
    const { price, auctionType } = req.body;

    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      { auctionPrice: Number(price), auctionType },
      { new: true } // Return the updated document

    );

    const updatedAuction = await Auction.findOneAndUpdate(
      { auctionId },
      { price: Number(price), auctionType },
      { new: true } // Return the updated document

    );



    res.status(200).json({ updatedAuction, updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.post('/addAuctionItem', async (req, res) => {
  try {
    const {
      productName,
      category,
      price,
      description,
      phone,
      auctionType,
      url,
      url1,
      url2,
      url3,
      product_id,
      userDetails,
      endDate,
      id
    } = req.body;



    const userID = userDetails?.id;

    const newAuction = new Auction({
      productName,
      created_at: Date.now(),
      product_id: id,
      auctionId: id,
      categories: category,
      auctioner_email: userDetails.email,
      phone,
      price: Number(price),
      description: description || '',
      userID,
      product_url: url,
      product_url1: url1,
      product_url2: url2,
      product_url3: url3,
      isOutOfStock: false,
      bids: 0,
      highestBid: 0,
      biders: [],
      canAccept: true,
      not_visible: false,
      endDate,
      auctionType,
      parent_Product_Id: product_id,
    });

    await newAuction.save();

    await Product.findOneAndUpdate({ product_id },
      {
        isAuctioned: true,
        auctionPrice: Number(price),
        auctionType,
        auctionId: id,
        endDate,
      }
    );




    res.status(200).json({ message: 'Auction item added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/addAuctionItemForUser', upload.array('images'), async (req, res) => {
  try {
    const {
      productName,
      price,
      description,
      auctionType,
      userDetails,
      endDate,
      id,
      selectedCondition,
      selectedConditionDescription,
      defects,
      color,
      minOffer
    } = req.body;

    const images = req.files;
    let imageUrls = [];
    let publicIds = [];

    console.log(
      userDetails)
    console.log(images)

    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });

      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
      publicIds = uploadResults.map((result) => result.public_id);
    }
    console.log('images uploaded')


    const newAuction = new Auction({
      productName,
      created_at: Date.now(),
      product_id: id,
      auctionId: id,
      phone: JSON.parse(userDetails).phone,
      auctioner_email: JSON.parse(userDetails).email,
      price: Number(price),
      description: description,
      userID: JSON.parse(userDetails).id,
      isOutOfStock: false,
      bids: 0,
      highestBid: 0,
      biders: [],
      canAccept: true,
      not_visible: false,
      endDate,
      publicIds,
      images: imageUrls,
      product_url: imageUrls[0],
      auctionType,
      isUserAuction: true,
      selectedCondition: selectedCondition || '',
      selectedConditionDescription: selectedConditionDescription || '',
      defects: defects || '',
      color: color || '',
      minOffer: minOffer || 0
    });

    await newAuction.save();


    res.status(200).json({ message: 'Auction item added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/get-user-auctions/:userID', async (req, res) => {

  const { userID } = req.params

  try {
    const auction = await Auction.find({ userID })
    res.status(200).send(auction)

  } catch (error) {
    res.status(500).send(error)
    console.log(error)
  }
})
router.delete('/delete-user-auctions/:id', async (req, res) => {

  const { id } = req.params

  try {
    const auction = await Auction.findOneAndDelete({ id })
    res.status(200).send('deelted')

  } catch (error) {
    res.status(500).send(error)
    console.log(error)
  }
})
router.get('/accepted-bid', async (req, res) => {
  try {
    const accepted_bids = await AcceptedBid.find({
      $or: [
        { hasPaid: { $exists: false } }, // Check if hasPaid doesn't exist
        { hasPaid: false } // Check if hasPaid is false
      ]
    });
    res.status(200).json({ accepted_bids });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/del-accepted-Bid/:id', async (req, res) => {
  const { id } = req.params
  const { auctionId } = req.body
  try {
    const updatedAuction = await Auction.findOneAndUpdate(
      { auctionId },
      {
        canAccept: true,
        acceptedFor: '',
        accepted_amount: 0,
      },
      { new: true } // Return the updated document
    );

    await AcceptedBid.findOneAndDelete({ _id: id })

    res.status(200).json({ updatedAuction })
  }
  catch (error) {
    console.log(error)
    res.status(500).json({ error })

  }
});

router.post('/acceptBid', async (req, res) => {
  try {
    const {
      theItem,
      theBider,
      currentUser,
      id
    } = req.body;

    const item = JSON.parse(theItem)
    const bider = JSON.parse(theBider)
    const user = JSON.parse(currentUser)



    const acceptedBid = new AcceptedBid({
      auctionID: item.id,
      id: id,
      email_of_bider: bider.email,
      id_of_bider: bider.userID,
      name_of_bider: bider.name,
      email_of_auctioner: item.auctioner_email,
      productName: item.productName,
      amount: bider.amount,
      number_of_auctioner: item.phone,
      number_of_bider: user.phone,
      time_of_acceptance: Date.now(),
      product_url: item.product_url,
      product_url1: item.product_url1,
      id_of_auctioner: user.id
    });

    await acceptedBid.save();
    const updatedAuction = await Auction.findOneAndUpdate(
      { auctionId: item.id },
      {
        canAccept: false,
        acceptedFor: bider.email,
        accepted_amount: bider.amount,
      },
      { new: true } // Return the updated document
    );

    res.status(200).json({ updatedDoc: updatedAuction });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});
router.put('/bid-payed-for', async (req, res) => {
  try {
    const {
      productID,
      user,
      auctionStringified,
      paidAmount,
      auctionID
    } = req.body;

    const auction = JSON.parse(auctionStringified)


    await AcceptedBid.findOneAndUpdate(
      { auctionID },
      {
        hasPaid: true
      },
      { new: true } // Return the updated document
    );

    const updatedAuction = await Auction.findOneAndUpdate(
      { product_id: productID },
      {
        not_visible: true,
        user_that_paid_id: user.id,
        auction_Item_Paid_For: auction.product_id,
        hasPaid: true
      },
      { new: true } // Return the updated document
    );

    res.status(200).json({ success: true, updatedDoc: updatedAuction });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});


router.post('/promoteProduct/:productId', async (req, res) => {
  try {
    const { endDate } = req.body
    const { productId } = req.params;

    // const endDate = new Date();
    // endDate.setDate(endDate.getDate() + 30); // Promote for 30 days from now

    // Update the Product model based on your schema
    const updatedDoc = await Product.findOneAndUpdate({ product_id: productId }, {
      promotStart: Date.now(),
      promotEnd: endDate,
      isPromoted: true,
    },
      { new: true }
    );

    res.status(200).json({ message: 'Product promoted successfully', updatedDoc: updatedDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/get-all-auctions', async (req, res) => {
  try {
    const auctions = await Auction.find({ not_visible: false });
    res.status(200).json({ auctions })

  } catch (error) {
    console.log('Error fetching products:', error);

  }
})

router.get('/getProduct/:product_id', async (req, res) => {
  try {
    const productId = req.params.product_id;

    const product = await Product.findOne({ product_id: productId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to update a product by product_id
router.put('/updateProduct/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    const {
      productName,
      category,
      price,
      offPrice,
      description,
      isOutOfStock,
      sizes,
      numericSizeObject,
    } = req.body;

    // Use Mongoose to find and update the product by product_id
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id },
      {
        $set: {
          productName,
          category,
          price: Number(price),
          offPrice: Number(offPrice),
          description,
          isOutOfStock,
          sizes: Object.values(numericSizeObject).some(value => !!value) || price > 0 ? {} : sizes,
          numericSizeObject: Object.values(sizes).some(value => !!value) ? {} : numericSizeObject,
        },
      },
      { new: true }
    );

    res.status(200).json({ updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start your server

// Endpoint to get products by subAdminID
router.get('/getProducts/:subAdminID', async (req, res) => {
  try {
    const { subAdminID } = req.params;

    // Use Mongoose to find products by subAdminID
    const products = await Product.find({ subAdminID });

    res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start your server


// Endpoint to delete a product by productId
router.delete('/deleteProduct/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Use Mongoose to find and remove the product by productId
    const deletedProduct = await Product.findOneAndDelete({ product_id: productId });

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If the product is deleted successfully, you can perform additional actions if needed
    // For example, update the totalItems in the shop

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start your server


router.get('/getProducts', async (req, res) => {
  try {
    // Fetch products from the database (replace with your database query)
    const products = await Product.find();

    res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.put('/updateProduct/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      productName,
      category,
      price,
      offPrice,
      description,
      isOutOfStock,
      sizes,
      numericSizeObject,
    } = req.body;

    function calculateDiscountPercentage(price, offPrice) {
      let percentageDiscount = ((price - offPrice) / price) * 100;
      return percentageDiscount;
    }
    let percentageDiscount
    let discountPrice

    if (offPrice > 0) {
      percentageDiscount = calculateDiscountPercentage(price, offPrice);
    } else {
      percentageDiscount = 0
    }
    discountPrice = offPrice > 0 ? offPrice : price;
    // Find and update the product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      {
        productName,
        category,
        price: Number(price),
        offPrice: Number(percentageDiscount),
        description,
        isOutOfStock,
        sizes,
        numericSizeObject,
        discountPrice
      },
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/addProduct', upload.array('images'), async (req, res) => {
  try {
    const {
      productName,
      category,
      price,
      offPrice,
      description,
      sizeObject,
      numericSizeObject,
      keyFeaturesStr,
      advancedCategory,
      shopName,
      subAdminID,
      shopID,
      id,
      variations
    } = req.body;

    const images = req.files;
    let imageUrls = [];
    let publicIds = []; // Store public IDs of uploaded images


    // Check if images were provided
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    // Process uploaded images
    const uploadPromises = images.map(async (file) => {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
      });
      imageUrls.push(uploadResult.secure_url);
      publicIds.push(uploadResult.public_id); // Store public ID
    });

    // Wait for all uploads to finish
    await Promise.all(uploadPromises);

    function calculateDiscountPercentage(price, offPrice) {
      let percentageDiscount = ((price - offPrice) / price) * 100;
      return percentageDiscount;
    }
    let percentageDiscount
    console.log("The discount is " + parseInt(percentageDiscount) + "% off.");
    let discountPrice

    if (offPrice > 0) {
      percentageDiscount = calculateDiscountPercentage(price, offPrice);
    } else {
      percentageDiscount = 0
    }
    discountPrice = offPrice > 0 ? offPrice : price;
    // discountPrice   = offPrice > 0 ? price - (price * offPrice) / 100 : price;

    console.log('numericSizeObject:', numericSizeObject);
    console.log('sizeObject:', sizeObject);

    const keyFeatures = JSON.parse(keyFeaturesStr)
    const newProduct = new Product({
      productName,
      created_at: Date.now(),
      product_id: id,
      amount: 1,
      categories: [...category?.split(','), ...advancedCategory?.split(',')],
      price: Number(price),
      offPrice: Number(percentageDiscount),
      description,
      shop: shopName,
      imageUrls,
      product_url: imageUrls[0],
      product_url1: imageUrls[1] || '',
      product_url2: imageUrls[2] || '',
      product_url3: imageUrls[3] || '',
      isOutOfStock: false,
      sizes: JSON.parse(sizeObject) || {},
      variations: [],
      subAdminID,
      shopID,
      discountPrice: parseInt(discountPrice),
      keyFeatures,
      numericSizeObject: JSON.parse(numericSizeObject) || {},
      publicIds: publicIds
    });

    await newProduct.save();

    res.status(200).json({ message: 'Product added successfully', id: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/addProduct1', upload.array('images'), async (req, res) => {
  try {
    const {
      productName,
      category,
      price,
      offPrice,
      description,
      sizeObject,
      numericSizeObject,
      keyFeaturesStr,
      advancedCategory,
      shopName,
      subAdminID,
      shopID,
      id
    } = req.body;

    const images = req.files;
    let imageUrls = [];


    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });


      // Wait for all uploads to finish and collect URLs
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    let discountPrice = offPrice > 0 ? price - (price * offPrice) / 100 : price;
    console.log('numericSizeObject:', numericSizeObject);
    console.log('sizeObject:', sizeObject);

    const keyFeatures = JSON.parse(keyFeaturesStr)
    const newProduct = new Product({
      productName,
      created_at: Date.now(),
      product_id: id,
      amount: 1,
      categories: [...category?.split(','), ...advancedCategory?.split(',')],
      price: Number(price),
      offPrice: Number(offPrice),
      description,
      shop: shopName,
      imageUrls,
      product_url: imageUrls[0],
      product_url1: imageUrls[1] || '',
      product_url2: imageUrls[2] || '',
      product_url3: imageUrls[3] || '',
      isOutOfStock: false,
      sizes: JSON.parse(sizeObject) || {},
      variations: [],
      subAdminID,
      shopID,
      discountPrice,
      keyFeatures,
      numericSizeObject: JSON.parse(numericSizeObject) || {},
    });

    await newProduct.save();

    // Update shop total items
    // await Shop.updateOne({ _id: shopID }, { $inc: { totalItems: 1 } });

    res.status(200).json({ message: 'Product added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/addProduct2', upload.array('images'), async (req, res) => {
  try {
    const {
      productName,
      category,
      price,
      offPrice,
      description,
      sizeObject,
      numericSizeObject,
      keyFeaturesStr,
      advancedCategory,
      shopName,
      subAdminID,
      shopID,
      id
    } = req.body;

    const images = req.files;
    let imageUrls = [];


    if (images && images.length > 0 && images !== null) {
      const uploadPromises = images.map(async (file) => {
        return await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
        });
      });


      // Wait for all uploads to finish and collect URLs
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    let discountPrice = offPrice > 0 ? price - (price * offPrice) / 100 : price;
    // console.log('numericSizeObject:', numericSizeObject);
    // console.log('sizeObject:', sizeObject);
    const keyFeatures = JSON.parse(keyFeaturesStr)

    const newProduct = new Product({
      productName,
      created_at: Date.now(),
      product_id: id,
      amount: 1,
      categories: [...category?.split(','), ...advancedCategory?.split(',')],
      price: Number(price),
      offPrice: Number(offPrice),
      description,
      shop: shopName,
      imageUrls,
      product_url: imageUrls[0],
      product_url1: imageUrls[1] || '',
      product_url2: imageUrls[2] || '',
      product_url3: imageUrls[3] || '',
      isOutOfStock: false,
      sizes: JSON.parse(sizeObject) || {},
      numericSizeObject: JSON.parse(numericSizeObject) || {},
      subAdminID,
      shopID,
      discountPrice,
      keyFeatures,
    });

    await newProduct.save();

    // Update shop total items
    // await Shop.updateOne({ _id: shopID }, { $inc: { totalItems: 1 } });

    res.status(200).json({ message: 'Product added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/postAd', upload.array('imgs'), async (req, res) => {
  try {
    const { description, title, link, expires, userID, type, timesToPost, paid } = req.body;
    const images = req.files;
    let formatedLink = link.includes('https://') ? link : `https://${link}`;
    let imageUrls = []
    let publicIds = []

    const uploadPromises = images.map(async (file) => {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
      });
      imageUrls.push(uploadResult.secure_url);
      publicIds.push(uploadResult.public_id);
    });

    // Wait for all uploads to finish
    await Promise.all(uploadPromises);


    const newAd = new Ad({
      description,
      title,
      link: formatedLink,
      imageUrls,
      publicIds,
      userID,
      expires,
      type,
      hasExpired: false,
      pages: timesToPost + 1,
      paid
    });

    await newAd.save();

    console.log('New Ad:', newAd);

    res.status(200).json({ message: 'Ad posted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/renewAd/:id', upload.none(), async (req, res) => {
  try {
    const { expires, type, paid } = req.body;
    const { id } = req.params;


    console.log(id, type, expires, paid)

    // Check if the provided ID is valid
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID provided' });
    }

    // Check if the provided expires value is a valid number
    if (isNaN(expires)) {
      return res.status(400).json({ error: 'Invalid expires value' });
    }

    // Update the ad with the provided ID
    const updatedAd = await Ad.findByIdAndUpdate(id, { expires, type, paid }, { new: true });

    // Check if the ad with the provided ID exists
    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.status(200).json({ success: true, updatedAd });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getSingleAd/:id', async (req, res) => {
  const { id } = req.params
  try {
    const ad = await Ad.findOne({ _id: id });
    res.status(200).json({ ad });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getPageAds/:pages', async (req, res) => {
  const pages = req.params.pages
  console.log('running')
  try {
    // Find all ads that are not expired
    const requestedPages = Number(pages)
    console.log("__________pages_______", pages)
    const ads = await Ad.find({ expires: { $gt: Date.now() }, pages: { $gt: requestedPages } });

    // Shuffle the ads randomly
    const shuffledAds = ads.sort(() => Math.random() - 0.5);

    // Send only the first two ads
    const selectedAds = shuffledAds.slice(0, 2);

    // Send the selected ads as a response
    res.status(200).send(selectedAds);
  } catch (error) {
    console.error('Error fetching and updating ads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// router.get('/getAds/:pages', async (req, res) => {
//   try {
//     // Extract the number of pages from the request parameters
//     const requestedPages = parseInt(req.params.pages);

//     // Find all ads that are not expired and have page numbers less than or equal to the requested number of pages
//     // const ads = await Ad.find({ expires: { $gt: Date.now() }, pages: { $lte: requestedPages } });

//     const ads = await Ad.find({ expires: { $gt: Date.now() } });
//     // If there are no matching ads, return an empty array
//     // if (ads.length === 0) {
//     //   return res.status(200).send([]);
//     // }

//     // Shuffle the ads randomly
//     // Shuffle the ads randomly
//     const shuffledAds = ads.sort(() => Math.random() - 0.5);

//     // Send only the first two ads
//     const selectedAds = shuffledAds.slice(0, 2);

//     // Send the selected ads as a response
//     res.status(200).send(selectedAds);
//   } catch (error) {
//     console.error('Error fetching and updating ads:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });






router.get('/nairalandProducts/:fixedPrice', async (req, res) => {
  try {
    const { fixedPrice } = req.params;

    // Validate that fixedPrice is provided
    if (!fixedPrice) {
      return res.status(400).json({ error: 'fixedPrice is a required parameter.' });
    }

    // Parse the value to ensure it's a number
    const price = Number(fixedPrice);

    // Fetch products with the specified price
    const products = await Product.find({ price: price });

    res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.use(router);
