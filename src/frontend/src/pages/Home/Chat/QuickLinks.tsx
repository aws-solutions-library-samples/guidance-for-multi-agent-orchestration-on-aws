import React from "react";
import { Box, Link } from "@cloudscape-design/components";

interface QuickLinksProps {
  onLinkClick: (text: string) => void;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ onLinkClick }) => {
  // Predefined messages
  const quickMessages = [
    {
      id: "product-recommendations",
      title: "Product Recommendations",
      text: "I've been looking at headphones and speakers, but I'm not sure which ones would be best for me. What products are in stock, and provide some recommendations that you think i'd like. - Logged in as cust010",
    },
    {
      id: "customer-preference",
      title: "Customer Preference",
      text: "I recently bought a trackmaster smartwatch and would like to purchase some other watches. What other available items you think match my preference? Let me know of any known issues and warranty information for the products too. - Logged in as cust002",
    },
    {
      id: "troubleshoot-watch",
      title: "Troubleshoot Watch",
      text: "My smartwatch's screen stopped responding suddenly, even though the battery is fully charged. I tried restarting it, but the issue persists. Recommend me a fix please, along with some other watches you think I might like. - Logged in as cust005",
    },
    {
      id: "recommendation-faq",
      title: "Recommendation & FAQ",
      text: "I like affordable speakers. Are there any available products in stock that match my preference? Also, give me the most common troubleshooting steps or FAQs for these products. - Logged in as cust007",
    },
    {
      id: "recommendation-product-inquiry",
      title: "Recommendation & Product Inquiry",
      text: "Recommend me products that other customers liked for high-tech and eco-friendly gadgets. Then, provide me the feedback customers had for these products from the past?",
    },
  ];

  return (
    <Box padding="s" textAlign="center">
      <div style={{ 
        display: "flex", 
        justifyContent: "space-evenly", 
        alignItems: "center", 
        width: "100%" 
      }}>
        {quickMessages.map((message) => (
          <Link
            key={message.id}
            href="#"
            onFollow={(event) => {
              event.preventDefault();
              onLinkClick(message.text);
            }}
          >
            {message.title}
          </Link>
        ))}
      </div>
    </Box>
  );
};

export default QuickLinks;