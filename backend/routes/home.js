const express = require('express');
const { Product, Category, Combo, Review, Setting, User, Order } = require('../models');
const calculateProductPricing = require('../utils/calculateProductPricing');

const router = express.Router();

/* GET /api/home */
router.get('/', async (req, res) => {
  try {
    // Featured products
    const featuredProducts = await Product.find({ status: 'active', isFeatured: true })
      .populate('category', 'name')
      .sort({ rating: -1 })
      .limit(6);

    const featuredMapped = featuredProducts.map(p => {
      const categoryDiscount = p.category && p.category.discount !== undefined ? p.category.discount : 0;
      const pricing = calculateProductPricing(p.price, categoryDiscount);
      return {
        id: p._id,
        name: p.name,
        price: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        discount: pricing.discountPercent,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
        images: p.images || [],
        mainImage: p.images && p.images.length > 0 ? p.images[0] : null,
        rating: p.rating,
        reviewCount: p.reviewCount,
        category_name: p.category ? p.category.name : '',
        stock: p.stock,
        stockStatus: p.stock === 0 ? 'out_of_stock' : p.stock <= p.reorderLevel ? 'low_stock' : 'in_stock'
      };
    });

    // Categories
    const categories = await Category.find({ status: 'active' }).sort({ name: 1 });
    const categoriesMapped = [];
    for (const c of categories) {
      const productCount = await Product.countDocuments({ category: c._id, status: 'active' });
      categoriesMapped.push({
        id: c._id,
        name: c.name,
        description: c.description,
        imageUrl: c.image,
        product_count: productCount
      });
    }

    // Combos with items
    const combos = await Combo.find({ status: 'active' }).populate('items.product', 'name images price').sort({ price: 1 });
    const combosMapped = combos.map(c => ({
      id: c._id,
      name: c.name,
      price: c.price,
      discount: c.discount || 0,
      description: c.description,
      image: c.image || null,
      tag: c.tag,
      items: c.items.map(i => ({
        product_id: i.product ? i.product._id : null,
        name: i.product ? i.product.name : 'Unknown',
        mainImage: i.product && i.product.images && i.product.images.length > 0 ? i.product.images[0] : null,
        price: i.product ? i.product.price : 0,
        quantity: i.quantity
      }))
    }));

    // Reviews / testimonials
    const testimonials = await Review.find({ status: 'approved' })
      .populate('user', 'fullName')
      .sort({ createdAt: -1 })
      .limit(3);

    const testimonialsMapped = testimonials.map(r => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      reviewText: r.comment,
      full_name: r.user ? r.user.fullName : 'Anonymous',
      createdAt: r.createdAt
    }));

    // Stats
    const [totalProducts, totalCustomers, totalOrders, totalCompletedOrders] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'active' }),
      Order.countDocuments({ status: { $ne: 'cancelled' } }),
      Order.countDocuments({ status: 'delivered' })
    ]);

    // Settings (single settings document from the Setting model — same source
    // of truth that Admin → Settings writes).
    const settingsDoc = await Setting.getSettings();
    const settings = {
      shopName: settingsDoc.shopName,
      trustedSinceYear: settingsDoc.trustedSinceYear != null ? settingsDoc.trustedSinceYear : 1985,
      customerCount: settingsDoc.customerCount != null ? settingsDoc.customerCount : 50000
    };

    res.json({
      success: true,
      featuredProducts: featuredMapped,
      categories: categoriesMapped,
      combos: combosMapped,
      testimonials: testimonialsMapped,
      stats: {
        total_products: totalProducts,
        total_customers: totalCustomers,
        total_orders: totalOrders,
        total_completed_orders: totalCompletedOrders
      },
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;