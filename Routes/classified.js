const express = require('express');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const classifiedAds = require('../models/classifiedAdsModel');



router.post('/promoteAd', async (req, res) => {
    try {
        const { title, price, name, id, expires, userID, type, number, timesToPost, paid, imgUrls, ownerName, is_market, is_pet, is_service, category } = req.body;

        // Check if an ad with the given ID already exists
        let existingAd = await classifiedAds.findOne({ id });

        if (existingAd) {
            // Update fields of the existing ad
            existingAd.expires = expires;
            existingAd.type = type;
            existingAd.timesToPost = timesToPost;
            existingAd.paid = paid;

            // Save the updated ad
            await existingAd.save();

            console.log('Updated Ad:', existingAd);

            res.status(200).json({ success: true, updatedAd: existingAd });
        } else {
            // If no ad with the given ID exists, create a new one
            const multiplyPosts = timesToPost * 2;
            const newAd = new classifiedAds({
                title,
                userID,
                expires,
                type,
                price,
                productName: name,
                number,
                hasExpired: false,
                timesToPost: multiplyPosts,
                paid,
                imgUrls,
                ownerName,
                is_market,
                is_pet,
                id,
                is_promo: true,
                is_service,
                category,
                product_url: imgUrls[0] || 'nill'
            });

            await newAd.save();

            console.log('New Ad:', newAd);

            res.status(200).json({ success: true, newAd: newAd });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// router.put('/renewAd/:id', async (req, res) => {
//     const { paid,
//         expires: timeFrame,
//         type,
//         price,
//         timesToPost
//     } = req.body;
//     const { id } = req.params
//     try {


//         // Check if an ad with the given ID already exists
//         let existingAd = await classifiedAds.findOne({ id });

//         if (existingAd) {
//             // Update fields of the existing ad
//             existingAd.expires = expires;
//             existingAd.type = type;
//             existingAd.timesToPost = timesToPost;
//             existingAd.paid = paid;

//             // Save the updated ad
//             await existingAd.save();

//             console.log('Updated Ad:', existingAd);

//             res.status(200).json({ success: true, updatedAd: existingAd });
//         } else {
//             // If no ad with the given ID exists, create a new one
//             const multiplyPosts = timesToPost * 2;
//             const newAd = new classifiedAds({
//                 title,
//                 userID,
//                 expires,
//                 type,
//                 price,
//                 productName: name,
//                 number,
//                 hasExpired: false,
//                 timesToPost: multiplyPosts,
//                 paid,
//                 imgUrls,
//                 ownerName,
//                 is_market,
//                 is_pet,
//                 id,
//                 is_promo: true,
//                 is_service,
//                 category,
//                 product_url: imgUrls[0] || 'nill'
//             });

//             await newAd.save();

//             console.log('New Ad:', newAd);

//             res.status(200).json({ success: true, newAd: newAd });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });




// Function to reset fields for all ads when a new day starts
async function resetAdFieldsForNewDay() {
    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    try {
        await classifiedAds.updateMany(
            { currentDate: { $ne: today } }, // Find ads where currentDate is not today
            { $set: { currentDate: today, timesPostedToday: 0, hourPosted: 0 } } // Reset relevant fields
        );
    } catch (error) {
        console.error('Error resetting fields for ads:', error);
    }
}

router.get('/getAds', async (req, res) => {
    try {
        // Reset fields for all ads at the start of a new day
        await resetAdFieldsForNewDay();

        // Find ads where timesToPost is greater than timesPostedToday
        const ads = await classifiedAds.aggregate([
            {
                $addFields: {
                    remainingTimesToPost: { $subtract: ["$timesToPost", "$timesPostedToday"] }
                }
            },

            {
                $match: {
                    $and: [
                        { remainingTimesToPost: { $gt: 0 } },
                        { expires: { $gte: Date.now() } }
                    ]
                }
            }
        ]);

        // Select only the first 20 ads
        const selectedAds = ads.slice(0, 20);

        // Update timesPostedToday and hourPosted for each selected ad
        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        // Update each selected ad's timesPostedToday and hourPosted fields
        for (const ad of selectedAds) {
            // Update timesPostedToday if the ad was posted on a previous day
            if (ad.currentDate.getDate() !== currentDate.getDate()) {
                ad.timesPostedToday = 1;
            } else {
                ad.timesPostedToday++;
            }
            // Update hourPosted
            ad.hourPosted = currentHour;
            // Save the changes to the ad
            await classifiedAds.findByIdAndUpdate(ad._id, { $set: { timesPostedToday: ad.timesPostedToday, hourPosted: ad.hourPosted } });
        }

        // Send the selected ads as a response
        res.status(200).json({ ads: selectedAds });
    } catch (error) {
        console.error('Error fetching and updating ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.get('/get-All-Ads', async (req, res) => {
    try {
        const PAGE_SIZE = 20; // Number of ads to send per request
        // Get pagination parameters from the query string
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const skip = (page - 1) * PAGE_SIZE;

        // Fetch ads based on pagination parameters
        const ads = await classifiedAds
            .find()
            .sort({ createdAt: 1 }) // Assuming createdAt field for sorting
            .skip(skip)
            .limit(PAGE_SIZE);

        // Check if there are more ads available
        const totalAdsCount = await classifiedAds.countDocuments();
        const hasMoreAds = totalAdsCount > page * PAGE_SIZE;

        // Send the filtered ads along with the flag indicating whether there are more ads available
        res.status(200).json({ ads, hasMoreAds });
    } catch (error) {
        console.error('Error fetching and updating ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.get('/feed-ads/:category/:limit/:skip', async (req, res) => {
    const { category, limit, skip } = req.params;

    try {
        // Reset fields for all ads at the start of a new day
        await resetAdFieldsForNewDay();

        // Find ads where timesToPost is greater than timesPostedToday and not expired
        const ads = await classifiedAds.aggregate([
            {
                $addFields: {
                    remainingTimesToPost: { $subtract: ["$timesToPost", "$timesPostedToday"] }
                }
            },
            {
                $match: {
                    $and: [
                        { category },
                        { remainingTimesToPost: { $gt: 0 } },
                        { expires: { $gte: Date.now() } }
                    ]
                }
            },
            { $sort: { createdAt: 1 } }, // Sort ads by createdAt in ascending order
            { $skip: parseInt(skip) }, // Skip ads based on the skip parameter
            { $limit: parseInt(limit) } // Limit ads based on the limit parameter
        ]);

        // Update timesPostedToday and hourPosted for each selected ad
        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        // Update each selected ad's timesPostedToday and hourPosted fields
        for (const ad of ads) {
            // Update timesPostedToday if the ad was posted on a previous day
            if (ad.currentDate.getDate() !== currentDate.getDate()) {
                ad.timesPostedToday = 1;
            } else {
                ad.timesPostedToday++;
            }
            // Update hourPosted
            ad.hourPosted = currentHour;
            // Save the changes to the ad
            await classifiedAds.findByIdAndUpdate(ad._id, { $set: { timesPostedToday: ad.timesPostedToday, hourPosted: ad.hourPosted } });
        }

        // Send the selected ads as a response
        res.status(200).json({ ads });
    } catch (error) {
        console.error('Error fetching and updating ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/init-feed-ads/:limit/:skip', async (req, res) => {
    const { limit, skip } = req.params;

    try {

        // Find ads where timesToPost is greater than timesPostedToday and not expired
        const ads = await classifiedAds.aggregate([
            {
                $addFields: {
                    remainingTimesToPost: { $subtract: ["$timesToPost", "$timesPostedToday"] }
                }
            },
            {
                $match: {
                    $and: [
                        { remainingTimesToPost: { $gt: 0 } },
                        { expires: { $gte: Date.now() } }
                    ]
                }
            },
            { $sort: { createdAt: 1 } }, // Sort ads by createdAt in ascending order
            { $skip: parseInt(skip) }, // Skip ads based on the skip parameter
            { $limit: parseInt(limit) } // Limit ads based on the limit parameter
        ]);

        // Update timesPostedToday and hourPosted for each selected ad
        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        // Update each selected ad's timesPostedToday and hourPosted fields
        for (const ad of ads) {
            // Update timesPostedToday if the ad was posted on a previous day
            if (ad.currentDate.getDate() !== currentDate.getDate()) {
                ad.timesPostedToday = 1;
            } else {
                ad.timesPostedToday++;
            }
            // Update hourPosted
            ad.hourPosted = currentHour;
            // Save the changes to the ad
            await classifiedAds.findByIdAndUpdate(ad._id, { $set: { timesPostedToday: ad.timesPostedToday, hourPosted: ad.hourPosted } });
        }

        // Send the selected ads as a response
        res.status(200).json({ ads });
    } catch (error) {
        console.error('Error fetching and updating ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/init-feed-ads/:limit/:skip', async (req, res) => {
    const { limit, skip } = req.params;
    const categories = ['pet', 'market', 'service']; // Available category types

    try {
        let ads = [];

        // Iterate over each category and fetch ads for each category
        for (const category of categories) {
            const categoryAds = await classifiedAds.aggregate([
                {
                    $addFields: {
                        remainingTimesToPost: { $subtract: ["$timesToPost", "$timesPostedToday"] }
                    }
                },
                {
                    $match: {
                        $and: [
                            { remainingTimesToPost: { $gt: 0 } },
                            { expires: { $gte: Date.now() } },
                            { category } // Filter ads by category
                        ]
                    }
                },
                { $sort: { createdAt: 1 } }, // Sort ads by createdAt in ascending order
                { $limit: parseInt(limit) } // Limit ads based on the limit parameter
            ]);

            // Add fetched ads for this category to the overall ads array
            ads = [...ads, ...categoryAds];
        }

        // Skip ads based on the skip parameter
        const startIndex = parseInt(skip);
        const endIndex = startIndex + parseInt(limit);
        ads = ads.slice(startIndex, endIndex);

        // Update timesPostedToday and hourPosted for each selected ad
        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        // Update each selected ad's timesPostedToday and hourPosted fields
        for (const ad of ads) {
            // Update timesPostedToday if the ad was posted on a previous day
            if (ad.currentDate.getDate() !== currentDate.getDate()) {
                ad.timesPostedToday = 1;
            } else {
                ad.timesPostedToday++;
            }
            // Update hourPosted
            ad.hourPosted = currentHour;
            // Save the changes to the ad
            await classifiedAds.findByIdAndUpdate(ad._id, { $set: { timesPostedToday: ad.timesPostedToday, hourPosted: ad.hourPosted } });
        }

        // Send the selected ads as a response
        res.status(200).json({ ads });
    } catch (error) {
        console.error('Error fetching and updating ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
