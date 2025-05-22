// Import mock data instead of making API calls
import { 
  mockOrders, 
  mockInventory, 
  mockProductCatalog, 
  mockPurchaseHistory, 
  mockCustomerPreferences 
} from './mock-data';

// Specific query functions for each data table returning static mock data
export const fetchOrders = async () => {
  // Return static mock data instead of making API calls
  return Promise.resolve(mockOrders);
};

export const fetchInventory = async () => {
  // Return static mock data instead of making API calls
  return Promise.resolve(mockInventory);
};

export const fetchProductCatalog = async () => {
  // Return static mock data instead of making API calls
  return Promise.resolve(mockProductCatalog);
};

export const fetchPurchaseHistory = async () => {
  // Return static mock data instead of making API calls
  return Promise.resolve(mockPurchaseHistory);
};

export const fetchCustomerPreferences = async () => {
  // Return static mock data instead of making API calls
  return Promise.resolve(mockCustomerPreferences);
};

// Function to fetch customer feedback data from text file
export const fetchCustomerFeedback = async () => {
  try {
    // Direct data from knowledge-base/customer_feedback.txt
    return `1. Feedback Date: 2024-11-05  
   "I'm genuinely impressed with the recommendations for electronics. The SonicWave Bluetooth Speaker was exactly what I needed for my small gatherings. The sound quality and battery life are perfect for my needs. Great job!"

2. Feedback Date: 2024-11-06  
   "Picked up these headphones and was really impressed with the sound quality! The noise cancellation is no joke—cuts out almost everything around me. Only wish the battery lasted a bit longer, but overall, solid purchase!" (Rating: 4)

3. Feedback Date: 2024-11-06  
   "The VitaFit Smartwatch recommendation fits my fitness routine perfectly! It tracks my workouts effortlessly and has been reliable even during intense sessions. I'd love to see more accessory options to go with it, like different bands and cases."

4. Feedback Date: 2024-11-06  
   "The recommendations have become more accurate over time. The recent suggestions, like the ZenSound Wireless Headphones, were spot-on for me. The noise-canceling feature is fantastic, especially when I need to focus or relax."

5. Feedback Date: 2024-11-07  
   "While the product recommendations are very personalized, I'd like to see some eco-friendly options, especially in the electronics category. Sustainable packaging for items like the TrackMaster Smartwatch would be a great addition!"

6. Feedback Date: 2024-11-07  
   "Loving the smartwatch! It tracks my workouts really well, and the notifications are so handy. Just be careful with the screen; mine got a small scratch after a week. Still happy with it, though!" (Rating: 4)

7. Feedback Date: 2024-11-07  
   "The curated list of electronics, especially the VitaFit Smartwatch, has helped me stay on track with my health goals. It's great to have a reliable fitness companion without having to endlessly search through options."

8. Feedback Date: 2024-11-08  
   "I feel like the tech suggestions are very tailored to my needs. The ProMax Laptop recommendation was exactly what I needed for work. It's high-performance and keeps up with my multitasking demands—it's like you know exactly what I'm looking for!"

9. Feedback Date: 2024-11-08  
   "Got this laptop for work and school, and it's pretty solid. Handles all my assignments easily, but if I start gaming, it heats up fast. Might need a cooling pad, but other than that, it's perfect for what I need." (Rating: 4)

10. Feedback Date: 2024-11-08  
   "The smartphone recommendation was fantastic! The Nova 5G Smartphone is fast, sleek, and the camera quality is amazing. Couldn't be happier with my choice."

11. Feedback Date: 2024-11-09  
   "The recommendations for mobile phones were perfect! The Infinity Ultra 5G had everything I needed, especially with 5G support and excellent battery life that lasts all day."

12. Feedback Date: 2024-11-09  
   "I didn't realize how much I needed the SoundSphere Pro Headphones until they were recommended! The immersive sound and noise-canceling feature have transformed my commute and made it so much more enjoyable."

13. Feedback Date: 2024-11-09  
   "Decided to invest in this smartwatch for fitness tracking, and it hasn't disappointed. I wear it all day! Just wish the band was a bit more durable. Overall, it's worth the price." (Rating: 4)

14. Feedback Date: 2024-11-10  
   "The GigaBook Gaming Laptop recommendation was just what I needed for both work and gaming. It's fast, reliable, and handles all my tasks seamlessly, even with high-performance games and multitasking. Thank you!"

15. Feedback Date: 2024-11-10  
   "The UltraBook Pro Laptop was a great recommendation for my on-the-go work needs. It's lightweight and has just the right specs for everyday tasks without being too bulky."

16. Feedback Date: 2024-11-10  
   "I love the ThunderBolt Speaker! It's compact yet powerful, making it ideal for traveling and quick outdoor gatherings. It's become a staple for my weekend adventures."

17. Feedback Date: 2024-11-11  
   "The Alpha One 5G is my new favorite! It has an impressive camera and smooth interface, and it's a great choice for anyone who values high-quality visuals and battery life."

18. Feedback Date: 2024-11-11  
   "Bought the laptop mainly for work, and it's great! The only problem I've had is that it gets pretty warm if I have too many tabs open. Other than that, it's quick and responsive." (Rating: 4)

19. Feedback Date: 2024-11-11  
   "The FlexTab Convertible Laptop was an excellent choice for work and entertainment. The 2-in-1 feature is convenient for presentations, and it has all the functionality I need."

20. Feedback Date: 2024-11-12  
   "The Eclipse X Smartphone was a great suggestion. The dual SIM is super convenient, and I love the edge-to-edge display. It's exactly what I needed for my busy schedule."

21. Feedback Date: 2024-11-12  
   "The smartphone is top-notch! Fast, sleek, and I'm blown away by the camera quality. Only drawback? It could have a better battery life, but that's minor considering everything else it offers." (Rating: 5)

22. Feedback Date: 2024-11-12  
   "I appreciate the recommendation of the Infinity Ultra 5G. Its long battery life and beautiful display make it a pleasure to use every day. Great job!"

23. Feedback Date: 2024-11-12  
   "The ProMax Laptop really shines for my design projects. It's powerful and handles large files with ease, making my workflow so much smoother."

24. Feedback Date: 2024-11-12  
   "The SoundSphere Pro Headphones are a game-changer. I didn't realize what I was missing with immersive sound until I got them. Perfect for tuning out distractions."

25. Feedback Date: 2024-11-12  
   "The ZenSound Wireless Headphones have made listening to music so much more enjoyable. The Bluetooth connection is seamless, and I'm very happy with the sound quality."`;
  } catch (error) {
    console.error("Error fetching customer feedback data:", error);
    throw error;
  }
};

// Function to fetch browse history data from text file
export const fetchBrowseHistory = async () => {
  try {
    // Direct data from knowledge-base/browse_history.txt
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
  - Likes on Product Ads: No  

- Date: 2024-11-14, Session Start: 08:00  
  - Product Browsed: VitaFit Smartwatch (prod002)  
  - Category: Watch  
  - Actions: Reviewed app compatibility with fitness tracking apps  
  - Total Clicks: 5  
  - Likes on Product Ads: Yes  

---

Customer ID: CUST003

- Date: 2024-11-11, Session Start: 15:05  
  - Product Browsed: SonicWave Bluetooth Speaker (prod004)  
  - Category: Speaker  
  - Time Spent: 15 minutes  
  - Actions: Compared with VitaFit Smartwatch (prod002) for sound capabilities  
  - Total Clicks: 10  
  - Likes on Product Ads: No  

- Date: 2024-11-13, Session Start: 14:30  
  - Product Browsed: SonicWave Bluetooth Speaker (prod004)  
  - Category: Speaker  
  - Actions: Accessed troubleshooting guide for Bluetooth pairing  
  - Total Clicks: 11  
  - Likes on Product Ads: Yes  

---

Customer ID: CUST004

- Date: 2024-11-12, Session Start: 10:55  
  - Product Browsed: VitaFit Smartwatch (prod002)  
  - Category: Watch  
  - Time Spent: 15 minutes  
  - Actions: Focused on fitness tracking and app compatibility; added to wishlist  
  - Total Clicks: 8  
  - Likes on Product Ads: Yes  

- Date: 2024-11-14, Session Start: 16:50  
  - Product Browsed: ZenSound Wireless Headphones (prod001), SonicWave Bluetooth Speaker (prod004)  
  - Category: Electronics  
  - Actions: Accessed user manuals; read forum on connectivity issues  
  - Total Clicks: 7  
  - Likes on Product Ads: No  

---

Customer ID: CUST005

- Date: 2024-11-10, Session Start: 11:20  
  - Product Browsed: Nova 5G Smartphone (prod005)  
  - Category: Mobile Phones  
  - Time Spent: 18 minutes  
  - Actions: Compared camera quality with existing device; checked battery replacement options  
  - Total Clicks: 6  
  - Likes on Product Ads: Yes  

- Date: 2024-11-14, Session Start: 20:10  
  - Product Browsed: Nova 5G Smartphone (prod005)  
  - Category: Mobile Phones  
  - Actions: Accessed FAQ on camera modes; read feedback on battery performance  
  - Total Clicks: 5  
  - Likes on Product Ads: Yes`;
  } catch (error) {
    console.error("Error fetching browse history data:", error);
    throw error;
  }
};

// Function to fetch FAQ text content
export const fetchFAQData = async () => {
  try {
    // Direct data from knowledge-base/faq/faq.txt
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

Product Name: SoundSphere Pro Headphones  
Category: Headphones  
Description: Immersive sound, over-ear, noise-canceling  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: TrackMaster Smartwatch  
Category: Watch  
Description: Heart rate monitor, GPS tracking  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: ThunderBolt Speaker  
Category: Speaker  
Description: Compact, waterproof, bass boost  

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
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: UltraBook Pro Laptop  
Category: Computer  
Description: Lightweight, 8GB RAM, 256GB SSD  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: GigaBook Gaming Laptop  
Category: Computer  
Description: High-end GPU, 32GB RAM, 1TB SSD  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: FlexTab Convertible Laptop  
Category: Computer  
Description: 2-in-1 touchscreen, 16GB RAM, 512GB SSD  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: Nova 5G Smartphone  
Category: Phone  
Description: Latest model, 5G enabled  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: Alpha One 5G  
Category: Phones  
Description: AI-enhanced camera, 128GB storage  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: Eclipse X Smartphone  
Category: Phones  
Description: Edge-to-edge display, dual SIM  

- Q: What is the warranty period for this product?  
  A: The product typically has a one-year warranty. Check your purchase receipt for details.

- Q: Can I use third-party accessories with this product?  
  A: While some third-party accessories may work, we recommend using accessories specifically designed for this product.

- Q: Does this product come with a user manual?  
  A: Yes, the product comes with a detailed user manual in the packaging.

---

Product Name: Infinity Ultra 5G  
Category: Phone  
Description: 6.7-inch display, long battery life  

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
    // Direct data from knowledge-base/ts/ts_guide.txt
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

Product Name: SoundSphere Pro Headphones  
Category: Headphones  
Issue ID: HD002  
Common Problems:  
1. Noise-canceling isn't effective  
   - Suggested Solution: Ensure proper fit and update firmware.  
2. Discomfort after prolonged use  
   - Suggested Solution: Adjust fit or take breaks between use.  
3. Connection drops frequently  
   - Suggested Solution: Reset Bluetooth settings on both devices.  

---

Product Name: TrackMaster Smartwatch  
Category: Watch  
Issue ID: SW002  
Common Problems:  
1. GPS not accurate  
   - Suggested Solution: Ensure GPS is turned on and recalibrate if needed.  
2. Heart rate sensor not working  
   - Suggested Solution: Clean the sensor and ensure proper wrist placement.  
3. Battery drains quickly  
   - Suggested Solution: Disable GPS when not in use and reduce screen brightness.  

---

Product Name: ThunderBolt Speaker  
Category: Speaker  
Issue ID: SP002  
Common Problems:  
1. Bass quality is lacking  
   - Suggested Solution: Adjust equalizer settings and ensure device compatibility.  
2. Speaker isn't charging  
   - Suggested Solution: Use the original charger or try another USB cable.  
3. Sound cuts out intermittently  
   - Suggested Solution: Move the speaker closer to the connected device.  

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
   - Suggested Solution: Reduce screen brightness and close background apps.  

---

Product Name: UltraBook Pro Laptop  
Category: Computer  
Issue ID: PC002  
Common Problems:  
1. System lag or delay  
   - Suggested Solution: Close unnecessary applications and free up storage.  
2. Issues with Bluetooth pairing  
   - Suggested Solution: Reset Bluetooth settings and retry.  
3. Limited battery life  
   - Suggested Solution: Reduce screen brightness and disable unnecessary services.  

---

Product Name: GigaBook Gaming Laptop  
Category: Computer  
Issue ID: PC003  
Common Problems:  
1. Laptop overheats during gaming  
   - Suggested Solution: Use a cooling pad and check fan settings.  
2. Game graphics lag  
   - Suggested Solution: Lower graphics settings for better performance.  
3. Battery drains quickly  
   - Suggested Solution: Play games while connected to the power adapter.  

---

Product Name: FlexTab Convertible Laptop  
Category: Computer  
Issue ID: PC004  
Common Problems:  
1. Touchscreen unresponsive  
   - Suggested Solution: Restart the device and calibrate the screen.  
2. Battery drains quickly in tablet mode  
   - Suggested Solution: Reduce screen brightness and close background apps.  
3. Hinge feels loose  
   - Suggested Solution: Contact support for hinge adjustments or repairs.  

---

Product Name: Nova 5G Smartphone  
Category: Phone  
Issue ID: PH001  
Common Problems:  
1. Battery drains faster than expected  
   - Suggested Solution: Limit background apps and reduce screen brightness.  
2. Network connectivity issues  
   - Suggested Solution: Restart the device or reset network settings.  
3. Phone overheating  
   - Suggested Solution: Avoid heavy apps in succession and keep software up to date.  

---

Product Name: Alpha One 5G  
Category: Phones  
Issue ID: PH002  
Common Problems:  
1. Camera issues or blurry photos  
   - Suggested Solution: Clean the lens and update the camera app.  
2. Storage fills up quickly  
   - Suggested Solution: Backup files and delete unnecessary apps.  
3. Charging problems  
   - Suggested Solution: Use the original charger and avoid third-party adapters.  

---

Product Name: Eclipse X Smartphone  
Category: Phones  
Issue ID: PH003  
Common Problems:  
1. SIM card not detected  
   - Suggested Solution: Reinsert the SIM card and restart the device.  
2. Display issues or flickering  
   - Suggested Solution: Adjust brightness settings and disable adaptive brightness.  
3. Battery doesn't last all day  
   - Suggested Solution: Close unused apps and reduce screen timeout.  

---

Product Name: Infinity Ultra 5G  
Category: Phone  
Issue ID: PH004  
Common Problems:  
1. Display unresponsive in certain areas  
   - Suggested Solution: Restart the device and recalibrate the touch settings.  
2. Poor battery performance after update  
   - Suggested Solution: Check for additional updates or roll back if possible.  
3. Network issues on 5G  
   - Suggested Solution: Toggle airplane mode on and off or reset network settings.`;
    
    return tsText;
  } catch (error) {
    console.error("Error fetching troubleshooting data:", error);
    throw error;
  }
};