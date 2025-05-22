// Mock data for all tables based on CSV files from the backend storage assets

export const mockOrders = [
  {
    order_id: "o001",
    customer_id: "cust001",
    product_id: "prod001",
    product_name: "zensound wireless headphones",
    order_status: "delivered",
    shipping_status: "delivered",
    return_exchange_status: "not returned",
    order_date: "10/25/24 10:00",
    delivery_date: "10/30/24 12:00"
  },
  {
    order_id: "o002",
    customer_id: "cust002",
    product_id: "prod002",
    product_name: "vitafit smartwatch",
    order_status: "shipped",
    shipping_status: "in transit",
    return_exchange_status: "not returned",
    order_date: "10/28/24 14:00",
    delivery_date: "11/3/24 16:00"
  },
  {
    order_id: "o003",
    customer_id: "cust003",
    product_id: "prod003",
    product_name: "promax laptop",
    order_status: "delivered",
    shipping_status: "delivered",
    return_exchange_status: "returned",
    order_date: "10/20/24 9:30",
    delivery_date: "10/25/24 18:00"
  },
  {
    order_id: "o004",
    customer_id: "cust004",
    product_id: "prod004",
    product_name: "sonicwave bluetooth speaker",
    order_status: "processing",
    shipping_status: "not shipped",
    return_exchange_status: "not returned",
    order_date: "11/1/24 15:45",
    delivery_date: "n/a"
  },
  {
    order_id: "o005",
    customer_id: "cust001",
    product_id: "prod005",
    product_name: "nova 5g smartphone",
    order_status: "cancelled",
    shipping_status: "n/a",
    return_exchange_status: "not returned",
    order_date: "11/2/24 11:20",
    delivery_date: "n/a"
  },
  {
    order_id: "o006",
    customer_id: "cust003",
    product_id: "prod002",
    product_name: "vitafit smartwatch",
    order_status: "delivered",
    shipping_status: "delivered",
    return_exchange_status: "not returned",
    order_date: "10/17/24 13:45",
    delivery_date: "10/22/24 11:30"
  },
  {
    order_id: "o007",
    customer_id: "cust004",
    product_id: "prod001",
    product_name: "zensound wireless headphones",
    order_status: "shipped",
    shipping_status: "in transit",
    return_exchange_status: "not returned",
    order_date: "10/12/24 9:15",
    delivery_date: "10/18/24 14:50"
  },
  {
    order_id: "o008",
    customer_id: "cust005",
    product_id: "prod003",
    product_name: "promax laptop",
    order_status: "delivered",
    shipping_status: "delivered",
    return_exchange_status: "returned",
    order_date: "9/15/24 10:20",
    delivery_date: "9/20/24 17:25"
  },
  {
    order_id: "o009",
    customer_id: "cust002",
    product_id: "prod004",
    product_name: "sonicwave bluetooth speaker",
    order_status: "processing",
    shipping_status: "not shipped",
    return_exchange_status: "not returned",
    order_date: "10/23/24 16:40",
    delivery_date: "n/a"
  },
  {
    order_id: "o010",
    customer_id: "cust001",
    product_id: "prod002",
    product_name: "vitafit smartwatch",
    order_status: "delivered",
    shipping_status: "delivered",
    return_exchange_status: "not returned",
    order_date: "10/7/24 8:30",
    delivery_date: "10/11/24 13:20"
  }
];

export const mockInventory = [
  {
    product_id: "p001",
    item_id: "p001",
    product_name: "zensound wireless headphones",
    category: "headphones",
    quantity_in_stock: 150,
    in_stock: "yes",
    reorder_threshold: 50,
    quantity_on_order: 100,
    last_restock_date: "10/1/24",
    warehouse_location: "WH-A1-15"
  },
  {
    product_id: "p002",
    item_id: "p002",
    product_name: "vitafit smartwatch",
    category: "watch",
    quantity_in_stock: 75,
    in_stock: "yes",
    reorder_threshold: 30,
    quantity_on_order: 50,
    last_restock_date: "10/5/24",
    warehouse_location: "WH-A2-12"
  },
  {
    product_id: "p003",
    item_id: "p003",
    product_name: "promax laptop",
    category: "computer",
    quantity_in_stock: 0,
    in_stock: "no",
    reorder_threshold: 50,
    quantity_on_order: 30,
    last_restock_date: "10/2/24",
    warehouse_location: "WH-B1-05"
  },
  {
    product_id: "p004",
    item_id: "p004",
    product_name: "sonicwave bluetooth speaker",
    category: "speaker",
    quantity_in_stock: 200,
    in_stock: "yes",
    reorder_threshold: 70,
    quantity_on_order: 100,
    last_restock_date: "9/25/24",
    warehouse_location: "WH-A2-18"
  },
  {
    product_id: "p005",
    item_id: "p005",
    product_name: "nova 5g smartphone",
    category: "phone",
    quantity_in_stock: 50,
    in_stock: "yes",
    reorder_threshold: 20,
    quantity_on_order: 30,
    last_restock_date: "10/8/24",
    warehouse_location: "WH-B2-07"
  },
  {
    product_id: "p006",
    item_id: "p006",
    product_name: "soundsphere pro headphones",
    category: "headphones",
    quantity_in_stock: 180,
    in_stock: "yes",
    reorder_threshold: 60,
    quantity_on_order: 100,
    last_restock_date: "9/20/24",
    warehouse_location: "WH-A1-20"
  },
  {
    product_id: "p007",
    item_id: "p007",
    product_name: "trackmaster smartwatch",
    category: "watch",
    quantity_in_stock: 40,
    in_stock: "yes",
    reorder_threshold: 25,
    quantity_on_order: 50,
    last_restock_date: "10/3/24",
    warehouse_location: "WH-A2-15"
  },
  {
    product_id: "p008",
    item_id: "p008",
    product_name: "thunderbolt speaker",
    category: "speaker",
    quantity_in_stock: 300,
    in_stock: "yes",
    reorder_threshold: 100,
    quantity_on_order: 150,
    last_restock_date: "9/15/24",
    warehouse_location: "WH-A2-22"
  },
  {
    product_id: "p009",
    item_id: "p009",
    product_name: "ultrabook pro laptop",
    category: "computer",
    quantity_in_stock: 15,
    in_stock: "yes",
    reorder_threshold: 8,
    quantity_on_order: 20,
    last_restock_date: "10/6/24",
    warehouse_location: "WH-B1-10"
  },
  {
    product_id: "p010",
    item_id: "p010",
    product_name: "gigabook gaming laptop",
    category: "computer",
    quantity_in_stock: 0,
    in_stock: "no",
    reorder_threshold: 5,
    quantity_on_order: 15,
    last_restock_date: "9/29/24",
    warehouse_location: "WH-B1-15"
  },
  {
    product_id: "p011",
    item_id: "p011",
    product_name: "flextab convertible laptop",
    category: "computer",
    quantity_in_stock: 25,
    in_stock: "yes",
    reorder_threshold: 10,
    quantity_on_order: 20,
    last_restock_date: "10/4/24",
    warehouse_location: "WH-B1-20"
  },
  {
    product_id: "p012",
    item_id: "p012",
    product_name: "alpha one 5g",
    category: "phone",
    quantity_in_stock: 30,
    in_stock: "yes",
    reorder_threshold: 15,
    quantity_on_order: 25,
    last_restock_date: "10/10/24",
    warehouse_location: "WH-B2-12"
  },
  {
    product_id: "p013",
    item_id: "p013",
    product_name: "eclipse x smartphone",
    category: "phone",
    quantity_in_stock: 60,
    in_stock: "yes",
    reorder_threshold: 25,
    quantity_on_order: 40,
    last_restock_date: "10/3/24",
    warehouse_location: "WH-B2-18"
  },
  {
    product_id: "p014",
    item_id: "p014",
    product_name: "infinity ultra 5g",
    category: "phone",
    quantity_in_stock: 45,
    in_stock: "yes",
    reorder_threshold: 20,
    quantity_on_order: 30,
    last_restock_date: "9/28/24",
    warehouse_location: "WH-B2-25"
  }
];

export const mockProductCatalog = [
  {
    product_id: "p001",
    product_name: "zensound wireless headphones",
    category: "headphones",
    price: "150",
    description: "1) noise-canceling 2) bluetooth enabled",
    rating: "4.5",
    popularity: "high",
    total_reviews: 156,
    available_colors: "Black, White, Blue"
  },
  {
    product_id: "p002",
    product_name: "vitafit smartwatch",
    category: "watch",
    price: "250",
    description: "1.) fitness tracking 2.) waterproof",
    rating: "4.6",
    popularity: "high",
    total_reviews: 98,
    available_colors: "Black, Silver, Rose Gold"
  },
  {
    product_id: "p003",
    product_name: "promax laptop",
    category: "computer",
    price: "1200",
    description: "1.) high-performance 2.) 16gb ram 3.) 512gb ssd",
    rating: "4.4",
    popularity: "high",
    total_reviews: 72,
    available_colors: "Silver, Space Gray"
  },
  {
    product_id: "p004",
    product_name: "sonicwave bluetooth speaker",
    category: "speaker",
    price: "100",
    description: "1.) portable 2.) long battery life",
    rating: "4.2",
    popularity: "medium",
    total_reviews: 112,
    available_colors: "Black, Blue, Red"
  },
  {
    product_id: "p005",
    product_name: "nova 5g smartphone",
    category: "phone",
    price: "800",
    description: "1.) latest model 2.) 5g enabled",
    rating: "4.7",
    popularity: "high",
    total_reviews: 84,
    available_colors: "Black, White, Green"
  },
  {
    product_id: "p006",
    product_name: "soundsphere pro headphones",
    category: "headphones",
    price: "130",
    description: "1.) immersive sound 2.) over-ear 3.) noise-canceling",
    rating: "4.4",
    popularity: "medium",
    total_reviews: 76,
    available_colors: "Black, Silver"
  },
  {
    product_id: "p007",
    product_name: "trackmaster smartwatch",
    category: "watch",
    price: "230",
    description: "1.) heart rate monitor 2.) gps tracking",
    rating: "4.3",
    popularity: "medium",
    total_reviews: 64,
    available_colors: "Black, Blue, Red"
  },
  {
    product_id: "p008",
    product_name: "thunderbolt speaker",
    category: "speaker",
    price: "90",
    description: "1.) compact 2.) waterproof 2.) bass boost",
    rating: "4.1",
    popularity: "medium",
    total_reviews: 58,
    available_colors: "Black, Blue"
  },
  {
    product_id: "p009",
    product_name: "ultrabook pro laptop",
    category: "computer",
    price: "1100",
    description: "1.) lightweight 2.) 8gb ram 3.) 256gb ssd",
    rating: "4.3",
    popularity: "high",
    total_reviews: 61,
    available_colors: "Silver, Gray"
  },
  {
    product_id: "p010",
    product_name: "gigabook gaming laptop",
    category: "computer",
    price: "1500",
    description: "1.) high-end gpu 2.) 32gb ram 3.) 1tb ssd",
    rating: "4.7",
    popularity: "high",
    total_reviews: 87,
    available_colors: "Black, Red"
  },
  {
    product_id: "p011",
    product_name: "flextab convertible laptop",
    category: "computer",
    price: "800",
    description: "1.) 2-in-1 touchscreen 2.) 16gb ram 3.) 512gb ssd",
    rating: "4.5",
    popularity: "medium",
    total_reviews: 53,
    available_colors: "Silver, Black"
  },
  {
    product_id: "p012",
    product_name: "alpha one 5g",
    category: "phones",
    price: "750",
    description: "1.) ai-enhanced camera 2.) 128gb storage",
    rating: "4.6",
    popularity: "high",
    total_reviews: 69,
    available_colors: "Black, Blue, White"
  },
  {
    product_id: "p013",
    product_name: "eclipse x smartphone",
    category: "phones",
    price: "650",
    description: "1.) edge-to-edge display 2.) dual sim",
    rating: "4.4",
    popularity: "medium",
    total_reviews: 45,
    available_colors: "Black, Silver"
  },
  {
    product_id: "p014",
    product_name: "infinity ultra 5g",
    category: "phone",
    price: "850",
    description: "1.) 6.7-inch display 2.) long battery life",
    rating: "4.6",
    popularity: "high",
    total_reviews: 79,
    available_colors: "Black, Gold, Blue"
  }
];

export const mockPurchaseHistory = [
  {
    purchase_id: "PCH001",
    customer_id: "cust001",
    product_id: "p001",
    product_name: "zensound wireless headphones",
    purchase_date: "10/15/23",
    quantity: 1,
    purchase_amount: "450",
    payment_method: "credit card"
  },
  {
    purchase_id: "PCH002",
    customer_id: "cust002",
    product_id: "p002",
    product_name: "vitafit smartwatch",
    purchase_date: "8/20/23",
    quantity: 3,
    purchase_amount: "75",
    payment_method: "paypal"
  },
  {
    purchase_id: "PCH003",
    customer_id: "cust003",
    product_id: "p003",
    product_name: "promax laptop",
    purchase_date: "9/5/23",
    quantity: 2,
    purchase_amount: "300",
    payment_method: "debit card"
  },
  {
    purchase_id: "PCH004",
    customer_id: "cust004",
    product_id: "p003",
    product_name: "promax laptop",
    purchase_date: "7/22/23",
    quantity: 5,
    purchase_amount: "125",
    payment_method: "credit card"
  },
  {
    purchase_id: "PCH005",
    customer_id: "cust005",
    product_id: "p004",
    product_name: "sonicwave bluetooth speaker",
    purchase_date: "11/1/23",
    quantity: 1,
    purchase_amount: "200",
    payment_method: "paypal"
  },
  {
    purchase_id: "PCH006",
    customer_id: "cust001",
    product_id: "p002",
    product_name: "vitafit smartwatch",
    purchase_date: "6/15/23",
    quantity: 4,
    purchase_amount: "320",
    payment_method: "credit card"
  },
  {
    purchase_id: "PCH007",
    customer_id: "cust002",
    product_id: "p001",
    product_name: "zensound wireless headphones",
    purchase_date: "9/1/23",
    quantity: 2,
    purchase_amount: "100",
    payment_method: "debit card"
  },
  {
    purchase_id: "PCH008",
    customer_id: "cust003",
    product_id: "p004",
    product_name: "sonicwave bluetooth speaker",
    purchase_date: "10/1/23",
    quantity: 1,
    purchase_amount: "250",
    payment_method: "paypal"
  },
  {
    purchase_id: "PCH009",
    customer_id: "cust004",
    product_id: "p005",
    product_name: "nova 5g smartphone",
    purchase_date: "8/10/23",
    quantity: 3,
    purchase_amount: "450",
    payment_method: "gift card"
  },
  {
    purchase_id: "PCH010",
    customer_id: "cust005",
    product_id: "p002",
    product_name: "vitafit smartwatch",
    purchase_date: "7/25/23",
    quantity: 5,
    purchase_amount: "175",
    payment_method: "debit card"
  }
];

export const mockCustomerPreferences = [
  {
    preference_id: "PREF001",
    customer_id: "cust001",
    age: 34,
    gender: "male",
    income: "75000",
    location: "new york-ny",
    marital_status: "single",
    preferred_category: "headphones",
    price_range: "100-200",
    preferred_brand: "samsung",
    loyalty_tier: "gold"
  },
  {
    preference_id: "PREF002",
    customer_id: "cust002",
    age: 29,
    gender: "female",
    income: "55000",
    location: "los angeles-ca",
    marital_status: "married",
    preferred_category: "watch",
    price_range: "100-300",
    preferred_brand: "apple",
    loyalty_tier: "silver"
  },
  {
    preference_id: "PREF003",
    customer_id: "cust003",
    age: 45,
    gender: "male",
    income: "87000",
    location: "chicago-il",
    marital_status: "divorced",
    preferred_category: "computer",
    price_range: "500-1500",
    preferred_brand: "dell",
    loyalty_tier: "platinum"
  },
  {
    preference_id: "PREF004",
    customer_id: "cust004",
    age: 38,
    gender: "female",
    income: "62000",
    location: "houston-tx",
    marital_status: "married",
    preferred_category: "speaker",
    price_range: "50-200",
    preferred_brand: "bose",
    loyalty_tier: "gold"
  },
  {
    preference_id: "PREF005",
    customer_id: "cust005",
    age: 50,
    gender: "male",
    income: "95000",
    location: "phoenix-az",
    marital_status: "single",
    preferred_category: "phone",
    price_range: "500-1000",
    preferred_brand: "oneplus",
    loyalty_tier: "silver"
  },
  {
    preference_id: "PREF006",
    customer_id: "cust006",
    age: 27,
    gender: "female",
    income: "48000",
    location: "philadelphia-pa",
    marital_status: "single",
    preferred_category: "headphones",
    price_range: "50-200",
    preferred_brand: "sony",
    loyalty_tier: "bronze"
  },
  {
    preference_id: "PREF007",
    customer_id: "cust007",
    age: 31,
    gender: "male",
    income: "68000",
    location: "san antonio-tx",
    marital_status: "married",
    preferred_category: "watch",
    price_range: "100-300",
    preferred_brand: "garmin",
    loyalty_tier: "silver"
  },
  {
    preference_id: "PREF008",
    customer_id: "cust008",
    age: 26,
    gender: "female",
    income: "50000",
    location: "san diego-ca",
    marital_status: "single",
    preferred_category: "speaker",
    price_range: "50-150",
    preferred_brand: "jbl",
    loyalty_tier: "gold"
  },
  {
    preference_id: "PREF009",
    customer_id: "cust009",
    age: 41,
    gender: "male",
    income: "79000",
    location: "dallas-tx",
    marital_status: "married",
    preferred_category: "computer",
    price_range: "1000-2000",
    preferred_brand: "hp",
    loyalty_tier: "gold"
  },
  {
    preference_id: "PREF010",
    customer_id: "cust010",
    age: 33,
    gender: "female",
    income: "65000",
    location: "san jose-ca",
    marital_status: "single",
    preferred_category: "phone",
    price_range: "600-900",
    preferred_brand: "google",
    loyalty_tier: "bronze"
  }
];

// Function to fetch customer feedback data from text file
export const fetchCustomerFeedback = async () => {
  try {
    // For demo purposes, returning hardcoded data directly to avoid fetch errors during build
    return `1. Feedback Date: 2024-11-05  
   "I'm genuinely impressed with the recommendations for electronics. The SonicWave Bluetooth Speaker was exactly what I needed for my small gatherings. The sound quality and battery life are perfect for my needs. Great job!"

2. Feedback Date: 2024-11-06  
   "Picked up these headphones and was really impressed with the sound quality! The noise cancellation is no joke—cuts out almost everything around me. Only wish the battery lasted a bit longer, but overall, solid purchase!" (Rating: 4)

3. Feedback Date: 2024-11-06  
   "The VitaFit Smartwatch recommendation fits my fitness routine perfectly! It tracks my workouts effortlessly and has been reliable even during intense sessions. I'd love to see more accessory options to go with it, like different bands and cases."

4. Feedback Date: 2024-11-06  
   "The recommendations have become more accurate over time. The recent suggestions, like the ZenSound Wireless Headphones, were spot-on for me. The noise-canceling feature is fantastic, especially when I need to focus or relax."

5. Feedback Date: 2024-11-07  
   "While the product recommendations are very personalized, I'd like to see some eco-friendly options, especially in the electronics category. Sustainable packaging for items like the TrackMaster Smartwatch would be a great addition!"`;
  } catch (error) {
    console.error("Error fetching customer feedback data:", error);
    throw error;
  }
};

// Function to fetch browse history data from text file
export const fetchBrowseHistory = async () => {
  try {
    // For demo purposes, returning hardcoded data directly to avoid fetch errors during build
    return `Customer ID: CUST001

- Date: 2024-11-12, Session Start: 13:25  
  - Product Browsed: ProMax Laptop (prod003)  
  - Category: Computers  
  - Time Spent: 25 minutes  
  - Actions: Compared RAM and storage options; downloaded PDF spec sheet on processor compatibility  
  - Total Clicks: 12  
  - Likes on Product Ads: Yes

- Date: 2024-11-13, Session Start: 18:15  
  - Product Browsed: ZenSound Wireless Headphones (prod001), SonicWave Bluetooth Speaker (prod004)  
  - Category: Electronics  
  - Time Spent: 20 minutes  
  - Actions: Compared sound quality reviews; checked FAQ for warranty options  
  - Total Clicks: 9  
  - Likes on Product Ads: No

---

Customer ID: CUST002

- Date: 2024-11-12, Session Start: 09:30  
  - Product Browsed: VitaFit Smartwatch (prod002)  
  - Category: Watch  
  - Time Spent: 10 minutes  
  - Actions: Checked fitness tracking accuracy FAQ; compared with Nova 5G Smartphone (prod005)  
  - Total Clicks: 7  
  - Likes on Product Ads: No`;
  } catch (error) {
    console.error("Error fetching browse history data:", error);
    throw error;
  }
};

// Function to fetch FAQ text content
export const fetchFAQData = async () => {
  try {
    // In a real application, you would fetch this from an API endpoint
    // For demo purposes, we'll return the text directly
    const faqText = `FAQ Section

---

Product Name: ZenSound Wireless Headphones  
Category: Headphones  
Description: Noise-canceling, Bluetooth enabled  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: VitaFit Smartwatch  
Category: Watch  
Description: Fitness tracking, waterproof  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: SonicWave Bluetooth Speaker  
Category: Speaker  
Description: Portable, long battery life  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: ProMax Laptop  
Category: Computer  
Description: High-performance, 16GB RAM, 512GB SSD  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.`;
    
    return faqText;
  } catch (error) {
    console.error("Error fetching FAQ data:", error);
    throw error;
  }
};

// Function to fetch Troubleshooting Guide text content
export const fetchTroubleshootingData = async () => {
  try {
    // In a real application, you would fetch this from an API endpoint
    // For demo purposes, we'll return the text directly
    const tsText = `Troubleshooting Guide

---

Product Name: ZenSound Wireless Headphones  
Category: Headphones  
Issue ID: HD001  
Common Problems:  
1. Bluetooth connection issues  
   - Suggested Solution: Reset the Bluetooth connection on both devices and try reconnecting.  
2. Battery drains quickly  
   - Suggested Solution: Charge fully before use and avoid high-volume playback.  
3. Audio quality is poor  
   - Suggested Solution: Ensure no interference from other devices and update firmware if available.  

---

Product Name: VitaFit Smartwatch  
Category: Watch  
Issue ID: SW001  
Common Problems:  
1. Screen is unresponsive  
   - Suggested Solution: Perform a factory reset. Follow instructions in the user manual.  
2. Syncing issues with the mobile app  
   - Suggested Solution: Reinstall the app and reconnect the watch.  
3. Inaccurate step tracking  
   - Suggested Solution: Ensure the watch is secured properly on your wrist.  

---

Product Name: SonicWave Bluetooth Speaker  
Category: Speaker  
Issue ID: SP001  
Common Problems:  
1. Low audio quality  
   - Suggested Solution: Adjust audio settings and avoid interference.  
2. Battery life is short  
   - Suggested Solution: Fully charge before use and limit volume level.  
3. Speaker won't turn on  
   - Suggested Solution: Perform a reset by holding the power button for 10 seconds.  

---

Product Name: ProMax Laptop  
Category: Computer  
Issue ID: PC001  
Common Problems:  
1. Overheating during heavy use  
   - Suggested Solution: Ensure proper ventilation, and consider using a cooling pad.  
2. Slow performance over time  
   - Suggested Solution: Clear unnecessary files and update software regularly.  
3. Battery drains quickly  
   - Suggested Solution: Reduce screen brightness and close background apps.`;
    
    return tsText;
  } catch (error) {
    console.error("Error fetching troubleshooting data:", error);
    throw error;
  }
};