/* ============================================================
   VENDHAN CRACKERS — Seed Script
   Run: npm run seed
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const {
  User,
  Admin,
  Category,
  Product,
  Cart,
  Order,
  Review,
  ContactMessage,
  Combo,
  Setting
} = require('../models');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // ---------- Check if data already exists (never overwrite production data) ----------
    const adminCount = await Admin.countDocuments();
    const categoryCount = await Category.countDocuments();
    const productCount = await Product.countDocuments();

    if (adminCount > 0 || categoryCount > 0 || productCount > 0) {
      console.log('⚠️  Database already contains data. Seed aborted to avoid overwriting.');
      console.log(`   Admins: ${adminCount}, Categories: ${categoryCount}, Products: ${productCount}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🧹 Database is empty. Starting seed...');

    // ---------- 1. Admin Account ----------
    const admin = await Admin.create({
      name: 'Vendhan Kumar',
      email: 'admin@vendhancrackers.in',
      password: 'admin123',
      role: 'super_admin',
      status: 'active'
    });
    console.log('✅ Admin created:', admin.email);

    // ---------- 2. Sample Users ----------
    const users = await User.create([
      {
        name: 'Ramesh Kumar',
        email: 'ramesh@example.com',
        phone: '9840012345',
        password: 'customer123',
        address: '12, Gandhi Street, T. Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017'
      },
      {
        name: 'Priya Venkatesh',
        email: 'priya@example.com',
        phone: '9840067890',
        password: 'customer123',
        address: '8, Anna Nagar East',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600102'
      },
      {
        name: 'Arun Subramanian',
        email: 'arun@example.com',
        phone: '9840011223',
        password: 'customer123',
        address: '24, Avinashi Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641018'
      }
    ]);
    console.log('✅ Users created:', users.length);

    // ---------- 3. Categories ----------
    const categories = await Category.create([
      {
        name: 'Sparklers',
        description: 'Bright golden sparklers for every celebration',
        image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80'
      },
      {
        name: 'Flower Pots',
        description: 'Colourful fountains that bloom in the night sky',
        image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=600&q=80'
      },
      {
        name: 'Rockets',
        description: 'Sky rockets with whistling and crackling effects',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80'
      },
      {
        name: 'Ground Chakkars',
        description: 'Spinning wheels of fire for ground-level fun',
        image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&q=80'
      },
      {
        name: 'Fancy Crackers',
        description: 'Premium fancy fireworks with special effects',
        image: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=600&q=80'
      },
      {
        name: 'Gift Boxes',
        description: 'Curated festive gift boxes for families',
        image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=600&q=80'
      }
    ]);
    console.log('✅ Categories created:', categories.length);

    // ---------- 4. Products ----------
    const products = await Product.create([
      {
        name: 'Deluxe Sparkler Pack (50 pcs)',
        category: categories[0]._id,
        description: 'Our best-selling Deluxe Sparkler Pack features 50 premium-quality sparklers with a bright, long-lasting golden glow.',
        price: 249,
        originalPrice: 310,
        discount: 20,
        images: [
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80',
          'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=500&q=80'
        ],
        stock: 120,
        reorderLevel: 30,
        rating: 4.8,
        reviewCount: 320,
        isFeatured: true
      },
      {
        name: 'Rosette Flower Pot',
        category: categories[1]._id,
        description: 'A classic flower pot that showers golden and silver sparks, creating a beautiful rosette of light.',
        price: 180,
        originalPrice: 210,
        discount: 15,
        images: [
          'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=500&q=80',
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80'
        ],
        stock: 85,
        reorderLevel: 30,
        rating: 4.5,
        reviewCount: 210,
        isFeatured: true
      },
      {
        name: 'Sky Rocket Trio (Pack of 3)',
        category: categories[2]._id,
        description: 'Three powerful sky rockets that soar high with a loud crackle and colourful burst.',
        price: 450,
        originalPrice: 600,
        discount: 25,
        images: [
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=80',
          'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=500&q=80'
        ],
        stock: 8,
        reorderLevel: 20,
        rating: 4.9,
        reviewCount: 165,
        isFeatured: true
      },
      {
        name: 'Chakkar Spinner (Combo of 5)',
        category: categories[3]._id,
        description: 'Five spinning ground chakkars that shoot colourful sparks while spinning on the ground.',
        price: 150,
        originalPrice: 165,
        discount: 10,
        images: [
          'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=500&q=80',
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80'
        ],
        stock: 200,
        reorderLevel: 50,
        rating: 4.4,
        reviewCount: 190,
        isFeatured: true
      },
      {
        name: 'Fancy Anar Bomb (Pack of 4)',
        category: categories[4]._id,
        description: 'Four fancy grenade-style crackers that shoot a fountain of gold and silver sparks.',
        price: 320,
        originalPrice: 460,
        discount: 30,
        images: [
          'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=500&q=80',
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=80'
        ],
        stock: 65,
        reorderLevel: 25,
        rating: 4.7,
        reviewCount: 140,
        isFeatured: true
      },
      {
        name: 'Festival Gift Box — Deluxe',
        category: categories[5]._id,
        description: 'A premium gift box containing an assortment of our finest crackers, beautifully packed for gifting.',
        price: 1999,
        originalPrice: 2499,
        discount: 20,
        images: [
          'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=500&q=80',
          'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=500&q=80'
        ],
        stock: 0,
        reorderLevel: 15,
        rating: 5.0,
        reviewCount: 85,
        isFeatured: true
      },
      {
        name: 'Twinkling Star Fountain',
        category: categories[1]._id,
        description: 'A medium-sized fountain that produces a brilliant display of twinkling golden stars.',
        price: 220,
        originalPrice: 270,
        discount: 18,
        images: [
          'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=500&q=80',
          'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=500&q=80'
        ],
        stock: 140,
        reorderLevel: 30,
        rating: 4.3,
        reviewCount: 95,
        isFeatured: false
      },
      {
        name: 'Whistling Rocket Pack (10 pcs)',
        category: categories[2]._id,
        description: 'Ten rockets that whistle loudly as they shoot into the sky, ending with a bright crackle.',
        price: 350,
        originalPrice: 400,
        discount: 12,
        images: [
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=80',
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80'
        ],
        stock: 12,
        reorderLevel: 25,
        rating: 4.6,
        reviewCount: 110,
        isFeatured: false
      },
      {
        name: 'Classic Sparkler Combo (100 pcs)',
        category: categories[0]._id,
        description: 'A budget-friendly combo of 100 classic sparklers with a consistent golden flame.',
        price: 390,
        originalPrice: 600,
        discount: 35,
        images: [
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80',
          'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=500&q=80'
        ],
        stock: 95,
        reorderLevel: 30,
        rating: 4.2,
        reviewCount: 75,
        isFeatured: false
      },
      {
        name: 'Premium Silver Sparklers (20 pcs)',
        category: categories[0]._id,
        description: 'Premium sparklers with a brilliant silver-white flame and minimal smoke.',
        price: 180,
        originalPrice: 220,
        discount: 18,
        images: [
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80',
          'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=500&q=80'
        ],
        stock: 40,
        reorderLevel: 15,
        rating: 4.55,
        reviewCount: 60,
        isFeatured: false
      },
      {
        name: 'Colour Chakkars (Pack of 10)',
        category: categories[3]._id,
        description: 'Ten chakkars that spin with a colourful spray of red, green and blue sparks.',
        price: 260,
        originalPrice: 310,
        discount: 16,
        images: [
          'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=500&q=80',
          'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=500&q=80'
        ],
        stock: 55,
        reorderLevel: 20,
        rating: 4.35,
        reviewCount: 50,
        isFeatured: false
      },
      {
        name: 'Bijili Bomb Pack (20 pcs)',
        category: categories[4]._id,
        description: 'Loud, bright popping bombs — the festival favourite for maximum sound.',
        price: 120,
        originalPrice: 150,
        discount: 20,
        images: [
          'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=500&q=80',
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=80'
        ],
        stock: 80,
        reorderLevel: 25,
        rating: 4.1,
        reviewCount: 130,
        isFeatured: false
      }
    ]);
    console.log('✅ Products created:', products.length);

    // ---------- 5. Combos ----------
    const combos = await Combo.create([
      {
        name: 'Starter Combo',
        price: 500,
        description: 'Perfect for small family celebrations. Includes sparklers, chakkars and flower pots.',
        items: [
          { product: products[0]._id, quantity: 2 },
          { product: products[3]._id, quantity: 4 },
          { product: products[1]._id, quantity: 2 }
        ],
        discount: 15
      },
      {
        name: 'Family Combo',
        price: 1000,
        description: 'Our most popular combo for the whole family. Includes sparklers, chakkars, flower pots and rockets with free gift wrap and delivery.',
        items: [
          { product: products[0]._id, quantity: 4 },
          { product: products[3]._id, quantity: 8 },
          { product: products[1]._id, quantity: 4 },
          { product: products[2]._id, quantity: 2 }
        ],
        discount: 20
      },
      {
        name: 'Grand Combo',
        price: 2000,
        description: 'The ultimate celebration pack. Includes a generous mix of our finest crackers with premium gift box and free delivery.',
        items: [
          { product: products[0]._id, quantity: 10 },
          { product: products[3]._id, quantity: 12 },
          { product: products[1]._id, quantity: 8 },
          { product: products[2]._id, quantity: 5 },
          { product: products[4]._id, quantity: 4 }
        ],
        discount: 25
      }
    ]);
    console.log('✅ Combos created:', combos.length);

    // ---------- 6. Shop Settings ----------
    await Setting.create({
      shopName: 'Vendhan Crackers',
      companyName: 'Vendhan Enterprises',
      phone: '+91 98400 12345',
      phone2: '+91 44 2653 7890',
      email: 'hello@vendhancrackers.in',
      email2: 'support@vendhancrackers.in',
      address: '42, Festival Street, Near Old Bus Stand, Chennai - 600001',
      deliveryCharge: 49,
      freeDeliveryThreshold: 1000,
      minimumOrderAmount: 2000,
      gst: 18,
      lowStockThreshold: 20,
      openingHours: '9:00 AM - 9:00 PM',
      mondaySaturdayHours: 'Mon – Sat: 9:00 AM – 9:00 PM',
      sundayHours: 'Sunday: 10:00 AM – 8:00 PM',
      festivalSeasonHours: 'Festival Season: Extended Hours',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      whatsappUrl: '',
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.0074118003454!2d77.72415797407349!3d9.641433279103854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06d900295818ff%3A0x8660c67bf4148bae!2sVendhan%20Fire%20Works!5e1!3m2!1sen!2sin!4v1787085840469!5m2!1sen!2sin',
      trustedSinceYear: 1985,
      customerCount: 50000
    });
    console.log('✅ Settings created');

    // ---------- 7. Sample Reviews ----------
    await Review.create([
      { user: users[0]._id, product: products[0]._id, rating: 5, comment: 'These sparklers are amazing! They burn bright and last long. My kids loved them during Diwali.' },
      { user: users[1]._id, product: products[0]._id, rating: 4, comment: 'Good quality and safe. The packaging was neat and delivery was quick.' },
      { user: users[2]._id, product: products[2]._id, rating: 5, comment: 'The rockets are powerful and the crackle sound is perfect!' },
      { user: users[0]._id, product: products[1]._id, rating: 4, comment: 'Beautiful rosette flower pot, very colourful sparks.' },
      { user: users[1]._id, product: products[3]._id, rating: 5, comment: 'My family loves these chakkars! Great value for money.' }
    ]);
    console.log('✅ Reviews created');

    // ---------- 8. Sample Orders ----------
    const orders = await Order.create([
      {
        orderId: 'VC-2026-0001',
        user: users[0]._id,
        customer: {
          name: 'Ramesh Kumar',
          phone: '9840012345',
          email: 'ramesh@example.com'
        },
        deliveryAddress: {
          address: '12, Gandhi Street, T. Nagar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600017'
        },
        items: [
          { product: products[0]._id, productName: products[0].name, price: 249, quantity: 2, subtotal: 498 },
          { product: products[1]._id, productName: products[1].name, price: 180, quantity: 1, subtotal: 180 }
        ],
        pricing: {
          subtotal: 678,
          discount: 67.8,
          deliveryCharge: 0,
          gst: 109.84,
          total: 720.04
        },
        payment: { method: 'cod', status: 'pending' },
        status: 'delivered',
        statusHistory: [
          { status: 'pending', changedAt: new Date('2026-01-10') },
          { status: 'confirmed', changedAt: new Date('2026-01-10') },
          { status: 'packed', changedAt: new Date('2026-01-11') },
          { status: 'delivered', changedAt: new Date('2026-01-12') }
        ]
      },
      {
        orderId: 'VC-2026-0002',
        user: users[1]._id,
        customer: {
          name: 'Priya Venkatesh',
          phone: '9840067890',
          email: 'priya@example.com'
        },
        deliveryAddress: {
          address: '8, Anna Nagar East',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600102'
        },
        items: [
          { product: products[0]._id, productName: products[0].name, price: 249, quantity: 2, subtotal: 498 },
          { product: products[3]._id, productName: products[3].name, price: 150, quantity: 2, subtotal: 300 },
          { product: products[2]._id, productName: products[2].name, price: 450, quantity: 1, subtotal: 450 }
        ],
        pricing: {
          subtotal: 1248,
          discount: 0,
          deliveryCharge: 0,
          gst: 224.64,
          total: 1472.64
        },
        payment: { method: 'upi', status: 'paid' },
        status: 'packed',
        statusHistory: [
          { status: 'pending', changedAt: new Date('2026-02-05') },
          { status: 'confirmed', changedAt: new Date('2026-02-05') },
          { status: 'packed', changedAt: new Date('2026-02-06') }
        ]
      },
      {
        orderId: 'VC-2026-0003',
        user: users[2]._id,
        customer: {
          name: 'Arun Subramanian',
          phone: '9840011223',
          email: 'arun@example.com'
        },
        deliveryAddress: {
          address: '24, Avinashi Road',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641018'
        },
        items: [
          { product: products[2]._id, productName: products[2].name, price: 450, quantity: 1, subtotal: 450 }
        ],
        pricing: {
          subtotal: 450,
          discount: 45,
          deliveryCharge: 49,
          gst: 72.9,
          total: 526.9
        },
        payment: { method: 'card', status: 'paid' },
        status: 'confirmed',
        statusHistory: [
          { status: 'pending', changedAt: new Date('2026-03-15') },
          { status: 'confirmed', changedAt: new Date('2026-03-15') }
        ]
      }
    ]);
    console.log('✅ Orders created:', orders.length);

    // ---------- 9. Sample Contact Messages ----------
    await ContactMessage.create([
      {
        name: 'Karthik',
        email: 'karthik@example.com',
        phone: '9840012345',
        subject: 'Bulk order enquiry',
        message: 'I would like to place a bulk order for Diwali. Please contact me.',
        status: 'new'
      },
      {
        name: 'Divya',
        email: 'divya@example.com',
        phone: '9840067890',
        subject: 'Delivery question',
        message: 'How long does delivery take to Madurai?',
        status: 'read'
      }
    ]);
    console.log('✅ Contact messages created');

    console.log('\n🎆 Seed completed successfully!');
    console.log('----------------------------------------');
    console.log('Admin login:');
    console.log('  Email: admin@vendhancrackers.in');
    console.log('  Password: admin123');
    console.log('----------------------------------------');
    console.log('Customer login:');
    console.log('  Email: ramesh@example.com');
    console.log('  Password: customer123');
    console.log('----------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();