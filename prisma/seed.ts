import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Restaurant Settings
  await prisma.restaurantSettings.deleteMany();
  const settings = await prisma.restaurantSettings.create({
    data: {
      restaurantName: 'Hungry Spoon',
      tagline: 'Artisanal Flavors & Modern Dining',
      address: 'Upper Road Sultanganj, Sri Plaza First Floor 813213',
      phone: '9534188701',
      email: 'contact@hungryspoon.com',
      gstNumber: '29ABCDE1234F1Z5',
      fssaiNumber: '11223344556677',
      defaultTaxRate: 5.0,
      defaultServiceCharge: 0.0,
      currencySymbol: '₹',
      receiptHeaderMessage: 'Welcome to Hungry Spoon!',
      receiptFooterMessage: 'Thank you for dining with us! Visit again.',
      allowNegativeStock: false,
    },
  });

  // 2. Users (Admin & Staff)
  await prisma.payment.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.customerBill.deleteMany();
  await prisma.kOTItem.deleteMany();
  await prisma.kOT.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@hungryspoon.com',
      name: 'Aditya Sharma (Head Chef & Admin)',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      username: 'staff',
      email: 'staff@hungryspoon.com',
      name: 'Priya Verma (Front Desk Staff)',
      passwordHash: staffPassword,
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('✓ Created users: admin (admin/admin123) and staff (staff/staff123)');

  // 3. Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Fresh Greens & Veggie Hub',
      contactPerson: 'Ramesh Patel',
      phone: '+91 98451 22334',
      email: 'orders@freshgreens.in',
      address: 'APMC Yard, Yard 4, Yeshwanthpur, Bengaluru',
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Heritage Dairy & Provisions',
      contactPerson: 'Suresh Kumar',
      phone: '+91 97412 55667',
      email: 'heritage.dairy@provisions.com',
      address: 'Dairy Circle, Bannerghatta Road, Bengaluru',
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: 'Royal Spices & Dry Goods Co.',
      contactPerson: 'Farhan Ali',
      phone: '+91 99003 44556',
      email: 'farhan@royalspices.com',
      address: 'Commercial Street, Bengaluru',
    },
  });

  // 4. Inventory Items (with some low-stock items for alert testing)
  const inventoryData = [
    {
      name: 'Fresh Malai Paneer',
      category: 'Dairy',
      currentQuantity: 8.5,
      unit: 'kg',
      minThreshold: 5.0,
      reorderQuantity: 15.0,
      unitCost: 380,
      supplierId: supplier2.id,
      storageLocation: 'Cold Room A2',
    },
    {
      name: 'Cooking Butter (Salted)',
      category: 'Dairy',
      currentQuantity: 3.2,
      unit: 'kg',
      minThreshold: 4.0, // LOW STOCK TRIGGER
      reorderQuantity: 10.0,
      unitCost: 480,
      supplierId: supplier2.id,
      storageLocation: 'Dairy Refrigerator 1',
    },
    {
      name: 'Fresh Heavy Cream',
      category: 'Dairy',
      currentQuantity: 2.5,
      unit: 'litre',
      minThreshold: 3.0, // LOW STOCK TRIGGER
      reorderQuantity: 8.0,
      unitCost: 220,
      supplierId: supplier2.id,
      storageLocation: 'Dairy Refrigerator 1',
    },
    {
      name: 'Basmati Rice (Supreme)',
      category: 'Grains',
      currentQuantity: 45.0,
      unit: 'kg',
      minThreshold: 15.0,
      reorderQuantity: 50.0,
      unitCost: 110,
      supplierId: supplier3.id,
      storageLocation: 'Dry Storage Shelf 1',
    },
    {
      name: 'Refined Wheat Flour (Maida)',
      category: 'Grains',
      currentQuantity: 28.0,
      unit: 'kg',
      minThreshold: 10.0,
      reorderQuantity: 30.0,
      unitCost: 45,
      supplierId: supplier3.id,
      storageLocation: 'Dry Storage Shelf 2',
    },
    {
      name: 'Tomatoes (Hybrid)',
      category: 'Vegetables',
      currentQuantity: 1.8,
      unit: 'kg',
      minThreshold: 6.0, // CRITICAL LOW STOCK
      reorderQuantity: 20.0,
      unitCost: 40,
      supplierId: supplier1.id,
      storageLocation: 'Veggie Bin 3',
    },
    {
      name: 'Onions (Red Medium)',
      category: 'Vegetables',
      currentQuantity: 22.0,
      unit: 'kg',
      minThreshold: 10.0,
      reorderQuantity: 30.0,
      unitCost: 35,
      supplierId: supplier1.id,
      storageLocation: 'Veggie Bin 1',
    },
    {
      name: 'Refined Sunflower Oil',
      category: 'Oils & Fats',
      currentQuantity: 12.0,
      unit: 'litre',
      minThreshold: 10.0,
      reorderQuantity: 25.0,
      unitCost: 140,
      supplierId: supplier3.id,
      storageLocation: 'Pantry Rack B',
    },
    {
      name: 'Alphonso Mango Pulp',
      category: 'Beverage Base',
      currentQuantity: 1.5,
      unit: 'litre',
      minThreshold: 3.0, // LOW STOCK
      reorderQuantity: 6.0,
      unitCost: 180,
      supplierId: supplier2.id,
      storageLocation: 'Beverage Chiller',
    },
    {
      name: 'Thick Curd / Yogurt',
      category: 'Dairy',
      currentQuantity: 9.0,
      unit: 'litre',
      minThreshold: 5.0,
      reorderQuantity: 12.0,
      unitCost: 65,
      supplierId: supplier2.id,
      storageLocation: 'Dairy Refrigerator 2',
    },
    {
      name: 'Garam Masala Blend',
      category: 'Spices',
      currentQuantity: 4.5,
      unit: 'kg',
      minThreshold: 2.0,
      reorderQuantity: 5.0,
      unitCost: 650,
      supplierId: supplier3.id,
      storageLocation: 'Spice Drawer A',
    },
  ];

  const inventoryMap: Record<string, string> = {};
  for (const item of inventoryData) {
    const created = await prisma.inventoryItem.create({ data: item });
    inventoryMap[item.name] = created.id;

    // Record initial stock movement
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: created.id,
        type: 'PURCHASE',
        quantityChange: item.currentQuantity,
        previousQuantity: 0,
        newQuantity: item.currentQuantity,
        reason: 'Opening stock initialization',
        performedById: admin.id,
      },
    });
  }
  console.log(`✓ Seeded ${inventoryData.length} inventory items with initial stock movements`);

  // 5. Menu Categories
  const catStarters = await prisma.menuCategory.create({
    data: { name: 'Starters & Appetizers', displayOrder: 1, description: 'Crispy, smoky, and flavorful starters' },
  });
  const catMain = await prisma.menuCategory.create({
    data: { name: 'Main Course Curries', displayOrder: 2, description: 'Rich, slow-cooked royal delicacies' },
  });
  const catBreads = await prisma.menuCategory.create({
    data: { name: 'Clay Oven Breads', displayOrder: 3, description: 'Freshly baked tandoori naans and rotis' },
  });
  const catRice = await prisma.menuCategory.create({
    data: { name: 'Dum Biryani & Rice', displayOrder: 4, description: 'Aromatic fragrant long-grain rice preparations' },
  });
  const catBeverages = await prisma.menuCategory.create({
    data: { name: 'Artisanal Beverages', displayOrder: 5, description: 'Cool lassis, coolers, and mocktails' },
  });
  const catDesserts = await prisma.menuCategory.create({
    data: { name: 'Desserts & Sweets', displayOrder: 6, description: 'Traditional decadent sweets with modern touches' },
  });

  // 6. Menu Items & Recipes
  const menuItems = [
    {
      name: 'Paneer Tikka Angara',
      categoryId: catStarters.id,
      description: 'Cottage cheese cubes marinated in charcoal roasted spices and hung curd.',
      sellingPrice: 340,
      imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Medium spice. Garnish with chaat masala and lime wedge.',
      recipe: [
        { ingredientName: 'Fresh Malai Paneer', qty: 0.2, unit: 'kg' },
        { ingredientName: 'Thick Curd / Yogurt', qty: 0.05, unit: 'litre' },
        { ingredientName: 'Garam Masala Blend', qty: 0.01, unit: 'kg' },
      ],
    },
    {
      name: 'Crispy Veg Spring Rolls',
      categoryId: catStarters.id,
      description: 'Golden fried wrappers stuffed with seasoned shredded vegetables and glass noodles.',
      sellingPrice: 260,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Cut diagonally into 4 pieces. Serve with sweet chilli dipping sauce.',
      recipe: [
        { ingredientName: 'Refined Wheat Flour (Maida)', qty: 0.08, unit: 'kg' },
        { ingredientName: 'Refined Sunflower Oil', qty: 0.05, unit: 'litre' },
        { ingredientName: 'Onions (Red Medium)', qty: 0.05, unit: 'kg' },
      ],
    },
    {
      name: 'Paneer Butter Masala',
      categoryId: catMain.id,
      description: 'Succulent paneer simmered in a velvet tomato, butter, and cashew nut gravy.',
      sellingPrice: 380,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Chef specialty. Finish with a swirl of fresh heavy cream and Kasuri methi.',
      recipe: [
        { ingredientName: 'Fresh Malai Paneer', qty: 0.2, unit: 'kg' },
        { ingredientName: 'Cooking Butter (Salted)', qty: 0.03, unit: 'kg' },
        { ingredientName: 'Fresh Heavy Cream', qty: 0.05, unit: 'litre' },
        { ingredientName: 'Tomatoes (Hybrid)', qty: 0.15, unit: 'kg' },
      ],
    },
    {
      name: 'Dal Makhani Royal',
      categoryId: catMain.id,
      description: 'Black lentils slow cooked overnight on charcoal embers, finished with churned butter and cream.',
      sellingPrice: 320,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Rich texture. Serve piping hot with extra butter dollop.',
      recipe: [
        { ingredientName: 'Cooking Butter (Salted)', qty: 0.04, unit: 'kg' },
        { ingredientName: 'Fresh Heavy Cream', qty: 0.04, unit: 'litre' },
        { ingredientName: 'Tomatoes (Hybrid)', qty: 0.1, unit: 'kg' },
      ],
    },
    {
      name: 'Butter Garlic Naan',
      categoryId: catBreads.id,
      description: 'Fluffy clay oven leavened bread brushed with garlic butter and fresh coriander.',
      sellingPrice: 85,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Cook until blistering golden. Brush hot butter generously.',
      recipe: [
        { ingredientName: 'Refined Wheat Flour (Maida)', qty: 0.12, unit: 'kg' },
        { ingredientName: 'Cooking Butter (Salted)', qty: 0.02, unit: 'kg' },
      ],
    },
    {
      name: 'Tandoori Roti',
      categoryId: catBreads.id,
      description: 'Whole wheat round bread baked against hot clay oven walls.',
      sellingPrice: 45,
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Crisp and warm. Can be served buttered or plain upon request.',
      recipe: [
        { ingredientName: 'Refined Wheat Flour (Maida)', qty: 0.08, unit: 'kg' },
      ],
    },
    {
      name: 'Royal Veg Dum Biryani',
      categoryId: catRice.id,
      description: 'Fragrant aged Basmati rice layered with garden vegetables, saffron milk, and aromatic spices.',
      sellingPrice: 360,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Served in clay handi with burani raita and mirchi ka salan.',
      recipe: [
        { ingredientName: 'Basmati Rice (Supreme)', qty: 0.2, unit: 'kg' },
        { ingredientName: 'Onions (Red Medium)', qty: 0.08, unit: 'kg' },
        { ingredientName: 'Thick Curd / Yogurt', qty: 0.05, unit: 'litre' },
        { ingredientName: 'Cooking Butter (Salted)', qty: 0.02, unit: 'kg' },
      ],
    },
    {
      name: 'Alphonso Mango Lassi',
      categoryId: catBeverages.id,
      description: 'Chilled thick whipped yogurt beverage blended with ripe Ratnagiri Alphonso mango pulp.',
      sellingPrice: 180,
      imageUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=500&auto=format&fit=crop&q=60',
      preparationNotes: 'Serve in earthen kulhad, topped with crushed pistachio slivers.',
      recipe: [
        { ingredientName: 'Thick Curd / Yogurt', qty: 0.18, unit: 'litre' },
        { ingredientName: 'Alphonso Mango Pulp', qty: 0.06, unit: 'litre' },
      ],
    },
    {
      name: 'Gulab Jamun with Rabri',
      categoryId: catDesserts.id,
      description: 'Soft warm khoya dumplings soaked in saffron-cardamom syrup, served on chilled rabri.',
      sellingPrice: 190,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60',
      preparationNotes: '2 pieces per portion. Rabri must be chilled at 4°C.',
      recipe: [
        { ingredientName: 'Fresh Heavy Cream', qty: 0.05, unit: 'litre' },
        { ingredientName: 'Refined Sunflower Oil', qty: 0.03, unit: 'litre' },
      ],
    },
  ];

  const createdMenuItems: any[] = [];
  for (const item of menuItems) {
    const { recipe, ...itemData } = item;
    const menuItem = await prisma.menuItem.create({
      data: itemData,
    });
    createdMenuItems.push(menuItem);

    // Create recipe
    const dbRecipe = await prisma.recipe.create({
      data: {
        menuItemId: menuItem.id,
        notes: `Standard recipe for ${menuItem.name}`,
      },
    });

    for (const ing of recipe) {
      const invId = inventoryMap[ing.ingredientName];
      if (invId) {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: dbRecipe.id,
            inventoryItemId: invId,
            quantityRequired: ing.qty,
            unit: ing.unit,
          },
        });
      }
    }
  }

  console.log(`✓ Seeded ${createdMenuItems.length} menu items with recipes and ingredient mappings`);

  // 7. Seed Sample Orders, KOTs, and Finalized Bills for realistic dashboard metrics
  // Order 1: Completed & Paid Dine-In order
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-0001',
      orderType: 'DINE_IN',
      tableNumber: 'Table 4',
      status: 'COMPLETED',
      orderNotes: 'Window table, anniversary celebration',
      subtotal: 1045,
      discount: 50,
      tax: 49.75,
      grandTotal: 1044.75,
      createdById: staff.id,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
    },
  });

  const paneerButter = createdMenuItems.find((i) => i.name === 'Paneer Butter Masala');
  const butterNaan = createdMenuItems.find((i) => i.name === 'Butter Garlic Naan');
  const mangoLassi = createdMenuItems.find((i) => i.name === 'Alphonso Mango Lassi');

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: paneerButter.id,
      itemName: paneerButter.name,
      unitPrice: paneerButter.sellingPrice,
      quantity: 2,
      notes: 'Make it rich and creamy, less spicy',
      status: 'SERVED',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: butterNaan.id,
      itemName: butterNaan.name,
      unitPrice: butterNaan.sellingPrice,
      quantity: 2,
      notes: 'Crispy well-done',
      status: 'SERVED',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: mangoLassi.id,
      itemName: mangoLassi.name,
      unitPrice: mangoLassi.sellingPrice,
      quantity: 1,
      status: 'SERVED',
    },
  });

  // KOT for Order 1
  const kot1 = await prisma.kOT.create({
    data: {
      kotNumber: 'KOT-1001',
      orderId: order1.id,
      version: 1,
      status: 'SERVED',
      orderType: 'DINE_IN',
      tableNumber: 'Table 4',
      notes: 'Window table',
      createdById: staff.id,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });

  await prisma.kOTItem.createMany({
    data: [
      { kotId: kot1.id, menuItemId: paneerButter.id, itemName: paneerButter.name, quantity: 2, instructions: 'Less spicy' },
      { kotId: kot1.id, menuItemId: butterNaan.id, itemName: butterNaan.name, quantity: 2, instructions: 'Crispy' },
      { kotId: kot1.id, menuItemId: mangoLassi.id, itemName: mangoLassi.name, quantity: 1, instructions: 'Cold' },
    ],
  });

  // Customer Bill for Order 1
  const bill1 = await prisma.customerBill.create({
    data: {
      billNumber: 'BILL-20261026-0001',
      orderId: order1.id,
      billDate: new Date(Date.now() - 2.5 * 3600 * 1000),
      subtotal: 1045,
      discount: 50,
      discountReason: 'Welcome Special',
      taxRate: 5.0,
      taxAmount: 49.75,
      serviceCharge: 0,
      grandTotal: 1044.75,
      paymentStatus: 'PAID',
      finalizedById: staff.id,
      createdAt: new Date(Date.now() - 2.5 * 3600 * 1000),
    },
  });

  await prisma.billItem.createMany({
    data: [
      { billId: bill1.id, menuItemId: paneerButter.id, itemName: paneerButter.name, quantity: 2, unitPrice: 380, lineTotal: 760 },
      { billId: bill1.id, menuItemId: butterNaan.id, itemName: butterNaan.name, quantity: 2, unitPrice: 85, lineTotal: 170 },
      { billId: bill1.id, menuItemId: mangoLassi.id, itemName: mangoLassi.name, quantity: 1, unitPrice: 180, lineTotal: 180 },
    ],
  });

  await prisma.payment.create({
    data: {
      billId: bill1.id,
      amount: 1044.75,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/20261026/889123',
      notes: 'Customer paid via Google Pay',
      receivedById: staff.id,
      createdAt: new Date(Date.now() - 2.4 * 3600 * 1000),
    },
  });

  // Order 2: Active Kitchen Order (PREPARING)
  const biryani = createdMenuItems.find((i) => i.name === 'Royal Veg Dum Biryani');
  const springRolls = createdMenuItems.find((i) => i.name === 'Crispy Veg Spring Rolls');

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-0002',
      orderType: 'DINE_IN',
      tableNumber: 'Table 7',
      status: 'PREPARING',
      orderNotes: 'Family dinner',
      subtotal: 620,
      discount: 0,
      tax: 31,
      grandTotal: 651,
      createdById: staff.id,
      createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      menuItemId: biryani.id,
      itemName: biryani.name,
      unitPrice: biryani.sellingPrice,
      quantity: 1,
      notes: 'Extra raita please',
      status: 'COOKING',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      menuItemId: springRolls.id,
      itemName: springRolls.name,
      unitPrice: springRolls.sellingPrice,
      quantity: 1,
      notes: 'Crispy fried',
      status: 'COOKING',
    },
  });

  const kot2 = await prisma.kOT.create({
    data: {
      kotNumber: 'KOT-1002',
      orderId: order2.id,
      version: 1,
      status: 'PREPARING',
      orderType: 'DINE_IN',
      tableNumber: 'Table 7',
      notes: 'Family dinner',
      createdById: staff.id,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });

  await prisma.kOTItem.createMany({
    data: [
      { kotId: kot2.id, menuItemId: biryani.id, itemName: biryani.name, quantity: 1, instructions: 'Extra raita' },
      { kotId: kot2.id, menuItemId: springRolls.id, itemName: springRolls.name, quantity: 1, instructions: 'Crispy fried' },
    ],
  });

  // Order 3: Ready for Billing (READY)
  const tikka = createdMenuItems.find((i) => i.name === 'Paneer Tikka Angara');
  const dalMakhani = createdMenuItems.find((i) => i.name === 'Dal Makhani Royal');

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20261026-0003',
      orderType: 'TAKEAWAY',
      tableNumber: 'Parcel #12',
      status: 'READY',
      orderNotes: 'Pack extra cutlery and napkins',
      subtotal: 660,
      discount: 0,
      tax: 33,
      grandTotal: 693,
      createdById: staff.id,
      createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
    },
  });

  await prisma.orderItem.createMany({
    data: [
      { orderId: order3.id, menuItemId: tikka.id, itemName: tikka.name, unitPrice: tikka.sellingPrice, quantity: 1, status: 'READY' },
      { orderId: order3.id, menuItemId: dalMakhani.id, itemName: dalMakhani.name, unitPrice: dalMakhani.sellingPrice, quantity: 1, status: 'READY' },
    ],
  });

  const kot3 = await prisma.kOT.create({
    data: {
      kotNumber: 'KOT-1003',
      orderId: order3.id,
      version: 1,
      status: 'READY',
      orderType: 'TAKEAWAY',
      tableNumber: 'Parcel #12',
      notes: 'Pack cutlery',
      createdById: staff.id,
      createdAt: new Date(Date.now() - 40 * 60 * 1000),
    },
  });

  await prisma.kOTItem.createMany({
    data: [
      { kotId: kot3.id, menuItemId: tikka.id, itemName: tikka.name, quantity: 1 },
      { kotId: kot3.id, menuItemId: dalMakhani.id, itemName: dalMakhani.name, quantity: 1 },
    ],
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        eventType: 'AUTH_LOGIN',
        action: 'User Login',
        entityType: 'User',
        entityId: admin.id,
        performedById: admin.id,
        details: JSON.stringify({ ip: '127.0.0.1', userAgent: 'System Boot' }),
      },
      {
        eventType: 'ORDER_CREATED',
        action: 'Created Dine-In Order',
        entityType: 'Order',
        entityId: order1.id,
        performedById: staff.id,
        details: JSON.stringify({ orderNumber: order1.orderNumber, table: 'Table 4' }),
      },
      {
        eventType: 'KOT_GENERATED',
        action: 'Dispatched KOT to Kitchen',
        entityType: 'KOT',
        entityId: kot1.id,
        performedById: staff.id,
        details: JSON.stringify({ kotNumber: kot1.kotNumber, orderNumber: order1.orderNumber }),
      },
      {
        eventType: 'BILL_FINALIZED',
        action: 'Finalized Customer Bill',
        entityType: 'CustomerBill',
        entityId: bill1.id,
        performedById: staff.id,
        details: JSON.stringify({ billNumber: bill1.billNumber, grandTotal: bill1.grandTotal }),
      },
      {
        eventType: 'PAYMENT_RECORDED',
        action: 'Payment Recorded via UPI',
        entityType: 'Payment',
        entityId: bill1.id,
        performedById: staff.id,
        details: JSON.stringify({ billNumber: bill1.billNumber, amount: 1044.75, method: 'UPI' }),
      },
    ],
  });

  console.log('✓ Seeded realistic active and completed orders, KOTs, customer bills, and audit logs');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
