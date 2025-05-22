// AgentFlowNodeConfig.tsx
import { Node, Edge } from 'reactflow';
import BedrockTheme from './BedrockTheme';
import { 
  FaRobot, FaUser, FaBook, FaHeadset, FaShoppingCart, 
  FaUserCog, FaBrain, FaDatabase, FaQuestion, FaClipboardList,
  FaGlobe, FaCommentDots,
  FaFirefoxBrowser,
  FaInternetExplorer,
  FaChrome
} from 'react-icons/fa';

// Initial nodes for the agent flow visualization
export const createInitialNodes = (): Node[] => [
  // Customer node at the top
  {
    id: 'customer',
    data: {
      label: 'Browser',
      type: 'user',
      borderColor: BedrockTheme.nodeStyles.user.borderColor,
      bgColor: BedrockTheme.nodeStyles.user.bgColor,
      icon: <FaGlobe size={18} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 350, y: 70 },
    type: 'customAgent'
  },

  // ROUTING_CLASSIFIER node between customer and supervisor
  {
    id: 'routing-classifier',
    data: {
      label: 'Routing Classifier',
      type: 'router',
      borderColor: BedrockTheme.colors.crypto,
      bgColor: '#E8F5E9', // Light green background
      icon: <FaBrain size={18} color={BedrockTheme.colors.crypto} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 590, y: 195 },
    type: 'customAgent'
  },

  // Supervisor Agent below the routing classifier
  {
    id: 'supervisor-agent',
    data: {
      label: 'Supervisor Agent (Main)',
      type: 'supervisor',
      borderColor: BedrockTheme.colors.supervisor,
      bgColor: BedrockTheme.nodeStyles.supervisor.bgColor,
      icon: <FaRobot size={18} color={BedrockTheme.colors.supervisor} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 350, y: 195 },
    type: 'customAgent'
  },
  
  // All sub-agents in a horizontal row below the supervisor - matching your screenshot
  // 1. Order Management Agent (leftmost)
  {
    id: 'order-mgmt-agent',
    data: {
      label: 'Order Mgmt Agent (Sub)',
      type: 'agent',
      borderColor: BedrockTheme.colors.market,
      bgColor: BedrockTheme.nodeStyles.market.bgColor,
      icon: <FaRobot size={18} color={BedrockTheme.colors.market} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 145, y: 380 },
    type: 'customAgent'
  },

  // 2. Product Recommendation Agent
  {
    id: 'product-rec-agent',
    data: {
      label: 'Product Rec. Agent (Sub)',
      type: 'agent',
      borderColor: BedrockTheme.colors.crypto,
      bgColor: '#F3E5F5',
      icon: <FaRobot size={18} color={BedrockTheme.colors.crypto} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 225, y: 570 },
    type: 'customAgent'
  },

  // 3. Personalization Agent
  {
    id: 'personalization-agent',
    data: {
      label: 'Personalization Agent (Sub)',
      type: 'agent',
      borderColor: BedrockTheme.colors.sentiment,
      bgColor: BedrockTheme.nodeStyles.sentiment.bgColor,
      icon: <FaRobot size={18} color={BedrockTheme.colors.sentiment} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 500, y: 570 },
    type: 'customAgent'
  },

  // 4. Troubleshooting Agent (rightmost)
  {
    id: 'ts-agent',
    data: {
      label: 'Troubleshoot Agent (Sub)',
      type: 'agent',
      borderColor: BedrockTheme.colors.sentiment,
      bgColor: '#FFE0B2',
      icon: <FaRobot size={18} color={BedrockTheme.colors.sentiment} />,
      isProcessing: false,
      processingComplete: false
    },
    position: { x: 600, y: 380 },
    type: 'customAgent'
  }
];

// Initial edges connecting the nodes
export const createInitialEdges = (): Edge[] => [
  // Direct connection from Customer to Supervisor Agent
  {
    id: 'e-customer-supervisor',
    source: 'customer',
    target: 'supervisor-agent',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'bottom', // Connect from bottom of customer/browser node
    targetHandle: 'top', // Connect to top of supervisor agent
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Customer'
    }
  },

  {
    id: 'e-supervisor-sa0',
    source: 'supervisor-agent',
    target: 'routing-classifier',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Routing Classifier'
    }
  },

  // Supervisor to all sub-agents - IDs follow format e-supervisor-sa# for trace data connection
  {
    id: 'e-supervisor-sa1', // Order Management
    source: 'supervisor-agent',
    target: 'order-mgmt-agent',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'bottom', // Connect from bottom of supervisor
    targetHandle: 'top', // Connect to top of order management agent
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Order Management'
    }
  },
  {
    id: 'e-supervisor-sa2', // Product Recommendation
    source: 'supervisor-agent',
    target: 'product-rec-agent',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'bottom', // Connect from bottom of supervisor
    targetHandle: 'top', // Connect to top of product recommendation agent
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Product Recommendation'
    }
  },
  {
    id: 'e-supervisor-sa3', // Personalization
    source: 'supervisor-agent',
    target: 'personalization-agent',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'bottom', // Connect from bottom of supervisor
    targetHandle: 'top', // Connect to top of personalization agent
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Personalization'
    }
  },
  {
    id: 'e-supervisor-sa4', // Troubleshooting
    source: 'supervisor-agent',
    target: 'ts-agent',
    animated: false,
    style: { strokeWidth: 2 },
    sourceHandle: 'bottom', // Connect from bottom of supervisor
    targetHandle: 'top', // Connect to top of troubleshooting agent
    type: 'customEdge',
    data: {
      callCount: 0,
      isActive: false,
      agentName: 'Troubleshooting'
    }
  }
];

// Create node and edge mapping for agent identification
export const nodeToAgentName = {
  'order-mgmt-agent': 'Order Management',
  'product-rec-agent': 'Product Recommendation', 
  'personalization-agent': 'Personalization',
  'ts-agent': 'Troubleshooting',
  'routing-classifier': 'Routing Classifier',
  'supervisor-agent': 'Supervisor'
};

// Create a mapping from edge IDs to their target agents
export const edgeTargetMap = {
  'e-supervisor-sa1': 'order-mgmt-agent',
  'e-supervisor-sa2': 'product-rec-agent',
  'e-supervisor-sa3': 'personalization-agent',
  'e-supervisor-sa4': 'ts-agent',
  'e-supervisor-sa0': 'routing-classifier'
};

// Create a path map that defines what edges should be active based on agent activation
export const agentPathMap = {
  'order-mgmt-agent': ['e-supervisor-sa1', 'e-customer-supervisor'],
  'product-rec-agent': ['e-supervisor-sa2', 'e-customer-supervisor'],
  'personalization-agent': ['e-supervisor-sa3', 'e-customer-supervisor'],
  'ts-agent': ['e-supervisor-sa4', 'e-customer-supervisor'],
  'routing-classifier': ['e-supervisor-sa0', 'e-customer-supervisor'],
  'supervisor-agent': ['e-customer-supervisor']
};

export default {
  createInitialNodes,
  createInitialEdges,
  nodeToAgentName,
  edgeTargetMap,
  agentPathMap
};
