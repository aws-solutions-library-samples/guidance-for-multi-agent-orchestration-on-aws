import boto3
import json
import time
import zipfile
from io import BytesIO
import logging
import pprint
import random
import string
import os

# Initialize AWS clients
# Get region directly from environment variables as a backup if session fails
region = os.environ.get('AWS_REGION', 'us-east-1') 
try:
    # Try creating a session the standard way first
    session = boto3.session.Session()
    region = session.region_name
except (AttributeError, Exception) as e:
    logging.warning(f"Could not create boto3 session: {str(e)}")
    
bedrock_agent_client = boto3.client('bedrock-agent', region_name=region)
bedrock_agent_runtime_client = boto3.client(
    'bedrock-agent-runtime',
    region_name=region
)
sts_client = boto3.client('sts', region_name=region)
account_id = sts_client.get_caller_identity()["Account"]  # Get the account ID dynamically
ssm_client = boto3.client('ssm')
iam_client = boto3.client('iam')
dynamodb_client = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

logging.basicConfig(
    format='[%(asctime)s] p%(process)s {%(filename)s:%(lineno)d} %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    try:
        print(f"Boto3 version: {boto3.__version__}")
        
        # Retry logic for getting parameter store values
        def get_parameter_with_retry(param_name, max_retries=5):
            retry_count = 0
            while retry_count < max_retries:
                try:
                    # Add delay with exponential backoff for retries
                    if retry_count > 0:
                        wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                        print(f"Retry {retry_count}/{max_retries} for parameter {param_name}, waiting {wait_time:.2f} seconds...")
                        time.sleep(wait_time)
                    
                    return get_from_parameter_store(param_name)
                    
                except Exception as e:
                    print(f"Error getting parameter {param_name}: {str(e)}")
                    retry_count += 1
                    
            # If we've exhausted retries
            raise Exception(f"Failed to get parameter {param_name} after {max_retries} retries")
        
        # Retrieve sub-agent info from Parameter Store with retry logic
        # AGENT IDs
        orderMgntAgentId = get_parameter_with_retry("/order_management/agentid")
        personalAgentId = get_parameter_with_retry("/personalization/agentid")
        prodRecAgentId = get_parameter_with_retry("/product_recommendation/agentid")
        troubleshootAgentId = get_parameter_with_retry("/troubleshoot/agentid")
        
        # ALIAS IDs
        orderMgntAliastId = get_parameter_with_retry("/order_management/aliasid")
        personalAliasId = get_parameter_with_retry("/personalization/aliasid")
        prodRecAliasId = get_parameter_with_retry("/product_recommendation/aliasid")
        troubleshootAliasId = get_parameter_with_retry("/troubleshoot/aliasid")

        # Build the sub-agent ARN references
        order_mgnt_alias_arn = f'arn:aws:bedrock:{region}:{account_id}:agent-alias/{orderMgntAgentId}/{orderMgntAliastId}'
        personalization_agent_alias_arn = f'arn:aws:bedrock:{region}:{account_id}:agent-alias/{personalAgentId}/{personalAliasId}'
        prod_rec_agent_alias_arn = f'arn:aws:bedrock:{region}:{account_id}:agent-alias/{prodRecAgentId}/{prodRecAliasId}'
        ts_agent_alias_arn = f'arn:aws:bedrock:{region}:{account_id}:agent-alias/{troubleshootAgentId}/{troubleshootAliasId}'

        print(f"Order Management ARN: {order_mgnt_alias_arn}")
        print(f"Personalization Agent ARN: {personalization_agent_alias_arn}")
        print(f"Product Recommendation ARN: {prod_rec_agent_alias_arn}")
        print(f"Troubleshooting Agent ARN: {ts_agent_alias_arn}")
        
    except Exception as e:
        print(f"Error in parameter initialization: {str(e)}")
        raise

    # Common config for the supervisor agent
    agent_name = 'SupervisorAgent'
    agent_instruction = """You are the Main AI Coordinator Agent in an AI-driven customer support system. You are responsible for answering customer requests in natural language. Your primary role is to interpret the customer's needs, delegate tasks to the appropriate specialized agents, and manage the responses from each agent to provide a personalized, cohesive, and helpful answer to the customer. Here are steps that I would like for you to follow:

1. Analyze the customer's input to determine the primary objective and identify the specific area of support required. For example, order inquiry, product recommendations, or troubleshooting and frequently asked questions.
2. Select the appropriate sub-agents to handle the request. These agents include:
    - Personalization Agent: This agent is used to tailor each response based on customer preferences and browser history. If a request includes a customer number, like cust001, this agent should be called to further personalize the response.
    - Order Management Agent: This agent helps with requests regarding customer orders, and details of item inventory and stock.
    - Product Recommendation Agent: This agent has information on the different available products, product purchase history, and customer feedback on products.
    - Troubleshooting Agent: This agent helps with frequently asked questions on, troubleshooting tips, and warranty information on products.

3. Sequential Agent Delegation examples:
    - For complex queries requiring multi-step actions or data from multiple sources, determine the sequence in which the sub-agents should be engaged. 
    - Execute each agent's task in the required order based on request, combining the outputs as needed.

4. Response Compilation and Presentation:
    - After collecting responses from the relevant sub-agents, synthesize the information into a clear, and cohesive response that addresses the request.
    - Ensure the response is as accurate, relevant, and answers the request.
 
Do not hallucinate, or go off script with information not instructed to you. If you cannot find specific information, provide a response based on data you do have.

Keep all responses under 100 words.
    """

    agent_description = "Multi-agent collaboration for customer support assistance"

    # The sub-agents to associate
    sub_agents_list = [
        {
            'sub_agent_alias_arn': order_mgnt_alias_arn,
            'sub_agent_instruction': "Use this agent when the customer asks about order-related information, such as order status, shipment tracking, or return processing. The agent will query order data in Amazon Athena and provide accurate details to answer inquiries.",
            'sub_agent_association_name': 'OrderManagementAgent',
            'relay_conversation_history': 'DISABLED'
        },
        {
            'sub_agent_alias_arn': prod_rec_agent_alias_arn,
            'sub_agent_instruction': "Use this agent to provide customers with personalized product recommendations based on their past purchases and preferences. This agent will analyze purchase history, product details, and customer deefback to suggest relevant items that match the customer's interests.",
            'sub_agent_association_name': 'ProductRecommendationAgent',
            'relay_conversation_history': 'DISABLED'
        },
        {
            'sub_agent_alias_arn': ts_agent_alias_arn,
            'sub_agent_instruction': "Use this agent when customers report issues or seek troubleshooting assistance with their products. The agent will retrieve product specifications and resolved issue logs, as well as access support guides to recommend solutions.",
            'sub_agent_association_name': 'TroubleshootAgent',
            'relay_conversation_history': 'DISABLED'
        },
        {
            'sub_agent_alias_arn': personalization_agent_alias_arn,
            'sub_agent_instruction': "Use this agent to enhance the customer experience by providing personalized responses and recommendations based on their individual preferences, interaction history, and profile data.",
            'sub_agent_association_name': 'PersonalizationAgent',
            'relay_conversation_history': 'DISABLED'
        }
    ]

    creation_results = []

    # We want the final alias name to be "nova-pro"
    alias_name = "supe_alias"
    # The foundation model chosen:
    foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    # 1) Create or update the agent in DRAFT, skipping finalization:
    supervisor_agent_id = create_agent(
        agent_name=agent_name,
        agent_instruction=agent_instruction,
        agent_foundation_model=foundation_model,
        idle_session_ttl_in_seconds=1800,
        agent_description=agent_description,
        agent_alias_name=alias_name,  # used in policy statement ID, etc.
        agent_collaboration="SUPERVISOR_ROUTER"
    )
    logger.info(f"SupervisorAgent in DRAFT -> ID={supervisor_agent_id}, alias={alias_name}")

    # 2) Associate sub-agents => each call triggers prepare & attach
    sup_alias_id, sup_alias_arn = associate_sub_agents(supervisor_agent_id, sub_agents_list)
    logger.info(f"Associated sub-agents with supervisor. Returned alias info: {sup_alias_id}, {sup_alias_arn}")

    # 3) Final prepare + create the final alias
    wait_agent_status_update(supervisor_agent_id)
    
    # Add retry logic for prepare_agent
    max_retries = 8
    retry_count = 0
    prepare_success = False
    
    while retry_count < max_retries and not prepare_success:
        try:
            # Add delay with exponential backoff for retries
            if retry_count > 0:
                wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                logger.info(f"Retry {retry_count}/{max_retries} for final prepare_agent, waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
            
            bedrock_agent_client.prepare_agent(agentId=supervisor_agent_id)
            prepare_success = True
            
        except bedrock_agent_client.exceptions.ThrottlingException as e:
            logger.warning(f"Request throttled during final prepare_agent: {str(e)}")
            retry_count += 1
            
        except Exception as e:
            logger.error(f"Error during final prepare_agent: {str(e)}")
            retry_count += 1
            
    if not prepare_success:
        raise Exception(f"Failed to prepare agent after {max_retries} retries")
        
    wait_agent_status_update(supervisor_agent_id)

    # Force creation of a NEW alias
    # If it exists, we delete it first, then create again
    # Add retry logic for alias operations
    def create_alias_with_retry(agent_id, alias_name, max_retries=8):
        retry_count = 0
        while retry_count < max_retries:
            try:
                # Add delay with exponential backoff for retries
                if retry_count > 0:
                    wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                    logger.info(f"Retry {retry_count}/{max_retries} for create_agent_alias, waiting {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                
                alias_resp = bedrock_agent_client.create_agent_alias(
                    agentAliasName=alias_name,
                    agentId=agent_id
                )
                return alias_resp
                
            except bedrock_agent_client.exceptions.ThrottlingException as e:
                logger.warning(f"Request throttled during create_agent_alias: {str(e)}")
                retry_count += 1
                
            except Exception as e:
                if "ConflictException" not in str(e):
                    logger.error(f"Error during create_agent_alias: {str(e)}")
                    retry_count += 1
                else:
                    # This needs special handling, break out to handle conflict
                    raise e
        
        # If we've exhausted retries
        raise Exception(f"Failed to create agent alias after {max_retries} retries")
    
    try:
        alias_resp = create_alias_with_retry(supervisor_agent_id, alias_name)
        sup_final_alias_id = alias_resp['agentAlias']['agentAliasId']
        sup_final_alias_arn = alias_resp['agentAlias']['agentAliasArn']
        logger.info(f"Created final alias '{alias_name}' for Agent ID={supervisor_agent_id}")
        
    except Exception as e:
        if "ConflictException" in str(e):
            # If alias already exists, remove it first, then recreate
            logger.warning(f"Alias '{alias_name}' already exists. Deleting and recreating...")
            
            # List aliases with retry
            retry_count = 0
            max_retries = 8
            existing_aliases = []
            
            while retry_count < max_retries and not existing_aliases:
                try:
                    if retry_count > 0:
                        wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                        logger.info(f"Retry {retry_count}/{max_retries} for list_agent_aliases, waiting {wait_time:.2f} seconds...")
                        time.sleep(wait_time)
                        
                    existing_aliases = bedrock_agent_client.list_agent_aliases(agentId=supervisor_agent_id).get('agentAliases', [])
                    
                except Exception as e_list:
                    logger.warning(f"Error listing agent aliases: {str(e_list)}")
                    retry_count += 1
            
            if not existing_aliases:
                raise Exception("Failed to list existing agent aliases")
                
            # Delete conflicting alias with retry
            for a in existing_aliases:
                if a['agentAliasName'] == alias_name:
                    retry_count = 0
                    delete_success = False
                    
                    while retry_count < max_retries and not delete_success:
                        try:
                            if retry_count > 0:
                                wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                                logger.info(f"Retry {retry_count}/{max_retries} for delete_agent_alias, waiting {wait_time:.2f} seconds...")
                                time.sleep(wait_time)
                                
                            bedrock_agent_client.delete_agent_alias(
                                agentId=supervisor_agent_id,
                                agentAliasId=a['agentAliasId']
                            )
                            delete_success = True
                            
                        except Exception as e_delete:
                            logger.warning(f"Error deleting agent alias: {str(e_delete)}")
                            retry_count += 1
                    
                    if not delete_success:
                        raise Exception(f"Failed to delete existing alias after {max_retries} retries")
                        
                    # Wait after deletion
                    time.sleep(10)
            
            # Re-create the alias with retry
            alias_resp = create_alias_with_retry(supervisor_agent_id, alias_name)
            sup_final_alias_id = alias_resp['agentAlias']['agentAliasId']
            sup_final_alias_arn = alias_resp['agentAlias']['agentAliasArn']
            logger.info(f"Re-created final alias '{alias_name}' for Agent ID={supervisor_agent_id}")
        else:
            # If it's some other kind of exception, raise it
            raise e

    # 4) Store final alias in Parameter Store
    param_key = f"/supervisor/{alias_name}"
    store_in_parameter_store(param_key, supervisor_agent_id, sup_final_alias_id)

    creation_results.append({
        "alias_name": alias_name,
        "foundation_model": foundation_model,
        "agent_id": supervisor_agent_id,
        "agent_alias_id": sup_final_alias_id,
        "agent_alias_arn": sup_final_alias_arn
    })

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "SupervisorAgent created in DRAFT, sub-agents associated, final alias forcibly created.",
            "created_aliases": creation_results
        })
    }

print(f"Boto3 version: {boto3.__version__}")

#
# =========================
#  AGENT / SUB-AGENT UTILS
# =========================
#

def associate_sub_agents(supervisor_agent_id, sub_agents_list):
    """
    1) For each sub-agent, call associate_agent_collaborator(...) then prepare the supervisor again.
    2) We REMOVED the final create_agent_alias(...) call here to avoid duplication of 'nova-pro'.
    3) Returns (None, None) to preserve signature.
    4) Added retry logic with exponential backoff for API calls.
    """
    for sub_agent in sub_agents_list:
        wait_agent_status_update(supervisor_agent_id)

        # Add retry logic for associate_agent_collaborator
        max_retries = 8
        retry_count = 0
        last_exception = None
        
        while retry_count < max_retries:
            try:
                # Add delay with exponential backoff for retries
                if retry_count > 0:
                    wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                    print(f"Retry {retry_count}/{max_retries} for associating sub-agent, waiting {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                
                bedrock_agent_client.associate_agent_collaborator(
                    agentId=supervisor_agent_id,
                    agentVersion='DRAFT',
                    agentDescriptor={'aliasArn': sub_agent['sub_agent_alias_arn']},
                    collaboratorName=sub_agent['sub_agent_association_name'],
                    collaborationInstruction=sub_agent['sub_agent_instruction'],
                    relayConversationHistory=sub_agent['relay_conversation_history']
                )
                print(f"Associated sub-agent '{sub_agent['sub_agent_association_name']}' with {supervisor_agent_id}")
                break  # Success, exit the retry loop
                
            except bedrock_agent_client.exceptions.ConflictException:
                print(f"ConflictException: sub-agent {sub_agent['sub_agent_association_name']} is already associated. Skipping.")
                break  # This is actually a success case, exit the retry loop
                
            except bedrock_agent_client.exceptions.ThrottlingException as e:
                print(f"Request throttled when associating sub-agent: {str(e)}")
                last_exception = e
                retry_count += 1
                
            except Exception as e:
                print(f"Error associating sub-agent: {str(e)}")
                last_exception = e
                retry_count += 1
                
        # If max retries reached and we didn't break out of the loop
        if retry_count == max_retries:
            print(f"Maximum retries ({max_retries}) exceeded when associating sub-agent.")
            if last_exception:
                raise last_exception

        # Add retry logic for prepare_agent
        wait_agent_status_update(supervisor_agent_id)
        
        retry_count = 0
        while retry_count < max_retries:
            try:
                # Add delay with exponential backoff for retries
                if retry_count > 0:
                    wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                    print(f"Retry {retry_count}/{max_retries} for preparing agent, waiting {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                
                bedrock_agent_client.prepare_agent(agentId=supervisor_agent_id)
                break  # Success, exit the retry loop
                
            except bedrock_agent_client.exceptions.ThrottlingException as e:
                print(f"Request throttled when preparing agent: {str(e)}")
                last_exception = e
                retry_count += 1
                
            except Exception as e:
                print(f"Error preparing agent: {str(e)}")
                last_exception = e
                retry_count += 1
                
        # If max retries reached and we didn't break out of the loop
        if retry_count == max_retries:
            print(f"Maximum retries ({max_retries}) exceeded when preparing agent.")
            if last_exception:
                raise last_exception
                
        wait_agent_status_update(supervisor_agent_id)

    # Return dummy values so the caller does not break
    return (None, None)

def list_agent_collaborators(agent_id):
    associations = bedrock_agent_client.list_agent_collaborators(
        agentId=agent_id,
        agentVersion='DRAFT'
    )
    return associations

def wait_agent_status_update(agent_id, max_retries=10, base_delay=5):
    """
    Enhanced: also waits if agent is 'VERSIONING' or ends with 'ING'.
    Now includes retry logic with exponential backoff for API calls.
    """
    retry_count = 0
    
    while True:
        try:
            # Add exponential backoff for retries on API calls
            if retry_count > 0:
                delay = min(30, base_delay * (2 ** (retry_count - 1)))  # Cap at 30 seconds max
                print(f"Retry {retry_count}: Waiting {delay} seconds before calling get_agent again...")
                time.sleep(delay)
                
            response = bedrock_agent_client.get_agent(agentId=agent_id)
            agent_status = response['agent']['agentStatus']
            retry_count = 0  # Reset retry count on successful API call
            
            # If it's 'VERSIONING' or ends with 'ING', keep waiting
            if agent_status.endswith('ING') or agent_status == 'VERSIONING':
                print(f'Waiting for agent {agent_id} to leave status: {agent_status}')
                time.sleep(5)  # nosemgrep: arbitrary-sleep
                continue
                
            # If the agent got deleted, break
            if agent_status == 'DELETED':
                print(f'Agent id {agent_id} is DELETED.')
                break
                
            # Otherwise, we've reached a stable state
            print(f'Agent id {agent_id} current status: {agent_status}')
            break
            
        except bedrock_agent_client.exceptions.ThrottlingException as e:
            retry_count += 1
            if retry_count > max_retries:
                print(f"Maximum retries ({max_retries}) exceeded when checking agent status.")
                raise e
            print(f"Request throttled when getting agent status: {str(e)}")
            
        except Exception as e:
            retry_count += 1
            if retry_count > max_retries:
                print(f"Maximum retries ({max_retries}) exceeded when checking agent status.")
                raise e
            print(f"Error getting agent status: {str(e)}")    

def create_agent(
    agent_name,
    agent_instruction,
    agent_foundation_model="anthropic.claude-3-5-sonnet-20241022-v2:0",
    idle_session_ttl_in_seconds=1800,
    agent_description="",
    action_group_config=None,
    kb_config=None,
    agent_collaboration='DISABLED',
    agent_alias_name="nova-pro"
):
    """
    1) Create/update an agent => 'DRAFT' version (no final alias).
    2) (Optional) Attach knowledge base & action groups while in DRAFT.
    3) Return the DRAFT agent ID. No finalize or alias is done here.
    """
    print(f"=== Creating/Updating Agent: '{agent_name}' with alias param '{agent_alias_name}' (DRAFT) ===")
    kb_id = kb_config['kb_id'] if kb_config else None

    # Create the role/policies
    agent_role = create_agent_role_and_policies(
        agent_name=agent_name,
        agent_foundation_model=agent_foundation_model,
        kb_id=kb_id
    )

    # Create or update => DRAFT
    agent_id = create_agent_object(
        agent_name=agent_name,
        agent_role=agent_role,
        agent_description=agent_description,
        idle_session_ttl_in_seconds=idle_session_ttl_in_seconds,
        agent_foundation_model=agent_foundation_model,
        agent_instruction=agent_instruction,
        agent_collaboration=agent_collaboration
    )
    wait_agent_status_update(agent_id)


    wait_agent_status_update(agent_id)
    print(f"Returning agent_id={agent_id} (DRAFT). No finalize or alias done here.")
    return agent_id

def create_agent_object(
    agent_name, agent_role, agent_description,
    idle_session_ttl_in_seconds, agent_foundation_model,
    agent_instruction, agent_collaboration
):
    """
    Create or update the named agent in DRAFT.
    If 'agent_name' already exists, we do update_agent(...)
    but only after waiting for that agent to be stable.
    """
    try:
        # Try to CREATE a new agent:
        response = bedrock_agent_client.create_agent(
            agentName=agent_name,
            agentResourceRoleArn=agent_role['Role']['Arn'],
            description=agent_description,
            idleSessionTTLInSeconds=idle_session_ttl_in_seconds,
            foundationModel=agent_foundation_model,
            instruction=agent_instruction,
            agentCollaboration=agent_collaboration
        )
        return response['agent']['agentId']

    except bedrock_agent_client.exceptions.ConflictException:
        # The agent name is already taken. So let's just UPDATE the existing one.
        existing_agents = bedrock_agent_client.list_agents(
            maxResults=1000
        )['agentSummaries']

        agent_id = None
        for summary in existing_agents:
            if summary['agentName'] == agent_name:
                agent_id = summary['agentId']
                break
        if not agent_id:
            raise RuntimeError(f"Conflict on agent name '{agent_name}', but no matching agent found.")

        # Wait for existing agent to be stable (not VERSIONING)
        wait_agent_status_update(agent_id)

        # Now do update_agent(...) safely
        bedrock_agent_client.update_agent(
            agentId=agent_id,
            agentName=agent_name,
            agentResourceRoleArn=agent_role['Role']['Arn'],
            description=agent_description,
            idleSessionTTLInSeconds=idle_session_ttl_in_seconds,
            foundationModel=agent_foundation_model,
            instruction=agent_instruction,
            agentCollaboration=agent_collaboration
        )

        return agent_id

#
# =========================
#   CREATE / ATTACH ROLES
# =========================
#


def create_agent_role_and_policies(agent_name, agent_foundation_model, kb_id=None):
    agent_bedrock_allow_policy_name = f"{agent_name}-ba"
    agent_role_name = f"BedrockExecutionRoleForAgents_{agent_name}"

    statements = [
        {
            "Sid": "BedrockAgentBedrockFoundationModelPolicy",
            "Effect": "Allow",
            "Action": "bedrock:InvokeModel",
            "Resource": [
                f"arn:aws:bedrock:{region}::foundation-model/*"
            ]
        },
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "bedrock:GetAgentAlias",
                "bedrock:InvokeAgent",
                "bedrock:UpdateAgent",
                "bedrock:AssociateAgentCollaborator",
                "bedrock:DisassociateAgentCollaborator",
                "bedrock:ListAgentCollaborators",
                "bedrock:PrepareAgent"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AmazonBedrockAgentInferenceProfilesCrossRegionPolicyProd",
            "Effect": "Allow",
            "Action": [
                "bedrock:CreateInferenceProfile",
                "bedrock:GetInferenceProfile",
                "bedrock:DeleteInferenceProfile",
                "bedrock:ListInferenceProfiles",
                "bedrock:InvokeModel",
                "bedrock:GetFoundationModel"
            ],
            "Resource": [
                "*",  # optional if you truly need universal coverage
                # Then your specific ARNs from the snippet:
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-lite-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0",
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-micro-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-micro-v1:0",
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-pro-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0",
                "arn:aws:bedrock:us-west-2::foundation-model/*"
            ]
        }
    ]


    bedrock_agent_bedrock_allow_policy_statement = {
        "Version": "2012-10-17",
        "Statement": statements
    }
    bedrock_policy_json = json.dumps(bedrock_agent_bedrock_allow_policy_statement)

    try:
        agent_bedrock_policy = iam_client.create_policy(
            PolicyName=agent_bedrock_allow_policy_name,
            PolicyDocument=bedrock_policy_json
        )
        print(f"Policy {agent_bedrock_allow_policy_name} created.")
    except iam_client.exceptions.EntityAlreadyExistsException:
        print(f"Policy {agent_bedrock_allow_policy_name} already exists. Reusing.")
        policy_arn = f"arn:aws:iam::{account_id}:policy/{agent_bedrock_allow_policy_name}"
        agent_bedrock_policy = {'Policy': {'Arn': policy_arn}}

    assume_role_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {"Service": "preprod.bedrock.aws.internal"},
                "Action": "sts:AssumeRole"
            },
            {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {"Service": "beta.bedrock.aws.internal"},
                "Action": "sts:AssumeRole"
            },
            {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {"Service": "bedrock.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }
        ]
    }
    assume_role_policy_document_json = json.dumps(assume_role_policy_document)

    try:
        existing_role = iam_client.get_role(RoleName=agent_role_name)
        print(f"Role {agent_role_name} already exists. Reusing.")
        agent_role = existing_role["Role"]
    except iam_client.exceptions.NoSuchEntityException:
        print(f"Role {agent_role_name} does not exist. Creating...")
        agent_role_resp = iam_client.create_role(
            RoleName=agent_role_name,
            AssumeRolePolicyDocument=assume_role_policy_document_json
        )
        agent_role = agent_role_resp["Role"]
        print(f"Created role {agent_role_name}")
        time.sleep(10)  # nosemgrep: arbitrary-sleep

    # Attach the custom policy
    attached_policies = iam_client.list_attached_role_policies(
        RoleName=agent_role_name
    )["AttachedPolicies"]
    attached_arns = [p["PolicyArn"] for p in attached_policies]
    policy_arn = agent_bedrock_policy["Policy"]["Arn"]
    if policy_arn not in attached_arns:
        iam_client.attach_role_policy(
            RoleName=agent_role_name,
            PolicyArn=policy_arn
        )
        print(f"Attached policy {agent_bedrock_allow_policy_name} to role {agent_role_name}.")
    else:
        print(f"Policy {agent_bedrock_allow_policy_name} already attached to {agent_role_name}.")

    # Create and attach the inference profiles policy
    inference_policy_doc, policy_name = get_bedrock_inference_policy(account_id, region)
    try:
        inference_policy = iam_client.create_policy(
            PolicyName=policy_name,
            PolicyDocument=json.dumps(inference_policy_doc)
        )
        # Attach the inference policy to the agent role
        iam_client.attach_role_policy(
            RoleName=agent_role_name,
            PolicyArn=inference_policy['Policy']['Arn']
        )
        print(f"Created and attached inference policy {policy_name}")
    except Exception as e:
        print(f"Error creating/attaching inference policy: {str(e)}")
        raise

    return {"Role": agent_role}

#
# =========================
#   LAMBDA / DYNAMODB UTILS
# =========================
#

def create_lambda_role(agent_name):
    lambda_function_role = f'{agent_name}-lambda-role'
    lambda_basic_role = 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    dynamodb_role = 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'
    athena_role = 'arn:aws:iam::aws:policy/AmazonAthenaFullAccess'
    s3_role = 'arn:aws:iam::aws:policy/AmazonS3FullAccess'

    assume_role_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }
        ]
    }

    assume_role_policy_document_json = json.dumps(assume_role_policy_document)
    try:
        lambda_iam_role = iam_client.create_role(
            RoleName=lambda_function_role,
            AssumeRolePolicyDocument=assume_role_policy_document_json
        )
        time.sleep(10)  # nosemgrep: arbitrary-sleep
    except iam_client.exceptions.EntityAlreadyExistsException:
        print("Role already exists -- deleting and creating it again")
        policies = iam_client.list_attached_role_policies(
            RoleName=lambda_function_role,
            MaxItems=100
        )
        for policy in policies['AttachedPolicies']:
            print(f"Detaching {policy['PolicyName']}")
            iam_client.detach_role_policy(
                RoleName=lambda_function_role,
                PolicyArn=policy['PolicyArn']
            )
        print(f"deleting {lambda_function_role}")
        iam_client.delete_role(RoleName=lambda_function_role)
        print(f"recreating {lambda_function_role}")
        lambda_iam_role = iam_client.create_role(
            RoleName=lambda_function_role,
            AssumeRolePolicyDocument=assume_role_policy_document_json
        )
        time.sleep(10)  # nosemgrep: arbitrary-sleep

    attached_policies = iam_client.list_attached_role_policies(
        RoleName=lambda_function_role, MaxItems=100
    )['AttachedPolicies']
    attached_arns = [p['PolicyArn'] for p in attached_policies]

    required_policies = [
        (lambda_basic_role, "basic lambda"),
        (athena_role,       "athena"),
        (s3_role,           "s3"),
        (dynamodb_role,     "dynamodb")
    ]
    for policy_arn, label in required_policies:
        if policy_arn not in attached_arns:
            print(f"Attaching {label} policy to {lambda_function_role}")
            iam_client.attach_role_policy(
                RoleName=lambda_function_role,
                PolicyArn=policy_arn
            )
        else:
            print(f"{label} policy already attached to {lambda_function_role}")

    return lambda_iam_role

def create_lambda(lambda_function_name, lambda_file_path, lambda_iam_role):
    s = BytesIO()
    z = zipfile.ZipFile(s, 'w')
    z.write(lambda_file_path)
    z.close()
    zip_content = s.getvalue()
    try:
        lambda_function = lambda_client.create_function(
            FunctionName=lambda_function_name,
            Runtime='python3.12',
            Timeout=60,
            Role=lambda_iam_role['Role']['Arn'],
            Code={'ZipFile': zip_content},
            Handler='lambda_function.lambda_handler'
        )
    except lambda_client.exceptions.ResourceConflictException:
        print(f'{lambda_function_name} already exists, deleting it and recreating')
        lambda_client.delete_function(FunctionName=lambda_function_name)
        time.sleep(10)  # nosemgrep: arbitrary-sleep
        lambda_function = lambda_client.create_function(
            FunctionName=lambda_function_name,
            Runtime='python3.12',
            Timeout=60,
            Role=lambda_iam_role['Role']['Arn'],
            Code={'ZipFile': zip_content},
            Handler='lambda_function.lambda_handler'
        )
    return lambda_function

def create_dynamodb(table_name, attribute_name):
    try:
        table = dynamodb_resource.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': attribute_name, 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': attribute_name, 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f'Creating table {table_name}...')
        table.wait_until_exists()
        print(f'Table {table_name} created successfully!')
    except dynamodb_client.exceptions.ResourceInUseException:
        print(f'Table {table_name} already exists!')
        print('Deleting and recreating it!')
        dynamodb_client.delete_table(TableName=table_name)
        time.sleep(10)  # nosemgrep: arbitrary-sleep
        table = dynamodb_resource.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': attribute_name, 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': attribute_name, 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f'Creating table {table_name}...')
        table.wait_until_exists()
        print(f'Table {table_name} created successfully!')

#
# =========================
#  PARAM STORE & MISC UTILS
# =========================
#

def store_in_parameter_store(key_name, agent_id, agent_alias_id, max_retries=8):
    """
    Store the agent_id and agent_alias_id in AWS Systems Manager Parameter Store.
    Added retry logic with exponential backoff for API calls.
    """
    parameter_value = f"{agent_id}/{agent_alias_id}"
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Add delay with exponential backoff for retries
            if retry_count > 0:
                wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                print(f"Retry {retry_count}/{max_retries} for storing parameter, waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
            
            ssm_client.put_parameter(
                Name="supervisorids",
                Value=parameter_value,
                Type="SecureString",
                Overwrite=True
            )
            print(f"Parameter '{key_name}' successfully stored in Systems Manager.")
            return True
            
        except ssm_client.exceptions.ThrottlingException as e:
            print(f"Request throttled when storing parameter: {str(e)}")
            retry_count += 1
            
        except Exception as e:
            print(f"Error storing parameter {key_name} in Systems Manager: {e}")
            retry_count += 1
    
    # If we've exhausted retries
    raise Exception(f"Failed to store parameter in Systems Manager after {max_retries} retries")

def get_from_parameter_store(key_name, max_retries=8):
    """
    Retrieve the agent_id or agent_alias_id from AWS Systems Manager Parameter Store.
    Added retry logic with exponential backoff for API calls.
    """
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Add delay with exponential backoff for retries
            if retry_count > 0:
                wait_time = min(30, (2 ** (retry_count - 1)) + (retry_count * 0.1))
                print(f"Retry {retry_count}/{max_retries} for retrieving parameter, waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
                
            response = ssm_client.get_parameter(Name=key_name, WithDecryption=True)
            parameter_value = response['Parameter']['Value']
            return parameter_value
            
        except ssm_client.exceptions.ThrottlingException as e:
            print(f"Request throttled when retrieving parameter: {str(e)}")
            retry_count += 1
            
        except Exception as e:
            print(f"Error retrieving parameter {key_name} from Systems Manager: {e}")
            retry_count += 1
    
    # If we've exhausted retries
    raise Exception(f"Failed to retrieve parameter from Systems Manager after {max_retries} retries")

#
# =========================
#    OPTIONAL CLEANUP UTILS
# =========================
#

def make_subagent_disabled(agent_id: str):
    """
    Sets the agentCollaboration to 'DISABLED'. 
    This is the usual state for sub-agents.
    """
    update_agent(agent_id=agent_id, agent_collaboration="DISABLED")
    print(f"Agent {agent_id} is now 'DISABLED'.")

def update_agent(
    agent_id: str,
    agent_name: str = None,
    foundation_model: str = None,
    agent_resource_role_arn: str = None,
    agent_collaboration: str = None,
    agent_description: str = None,
    agent_instruction: str = None,
    idle_session_ttl_in_seconds: int = None
):
    """
    Safely update an agent by pulling current fields if not specified,
    so none of the required fields are missing.
    """
    wait_agent_status_update(agent_id)
    current_agent = bedrock_agent_client.get_agent(agentId=agent_id)["agent"]

    final_agent_name = agent_name or current_agent["agentName"]
    final_foundation_model = foundation_model or current_agent["foundationModel"]
    final_resource_role_arn = agent_resource_role_arn or current_agent.get("agentResourceRoleArn")
    final_collaboration = agent_collaboration or current_agent.get("agentCollaboration")
    final_description = agent_description if agent_description is not None else current_agent.get("description", "")
    final_instruction = agent_instruction if agent_instruction is not None else current_agent.get("instruction", "")
    final_idle_ttl = idle_session_ttl_in_seconds if idle_session_ttl_in_seconds else current_agent.get("idleSessionTTLInSeconds", 1800)

    bedrock_agent_client.update_agent(
        agentId=agent_id,
        agentName=final_agent_name,
        foundationModel=final_foundation_model,
        agentResourceRoleArn=final_resource_role_arn,
        agentCollaboration=final_collaboration,
        description=final_description,
        instruction=final_instruction,
        idleSessionTTLInSeconds=final_idle_ttl,
    )
    wait_agent_status_update(agent_id)

    updated_agent = bedrock_agent_client.get_agent(agentId=agent_id)["agent"]
    print(f"Agent {agent_id} updated successfully. Current status: {updated_agent['agentStatus']}")
    return updated_agent

def invoke_agent_helper(
    query,
    session_id,
    agent_id,
    alias_id,
    enable_trace=True,
    session_state=None
):
    end_session = False
    if not session_state:
        session_state = {}

    agent_response = bedrock_agent_runtime_client.invoke_agent(
        inputText=query,
        agentId=agent_id,
        agentAliasId=alias_id,
        sessionId=session_id,
        enableTrace=enable_trace,
        endSession=end_session,
        sessionState=session_state
    )

    if enable_trace:
        logger.info(pprint.pprint(agent_response))

    event_stream = agent_response['completion']
    try:
        for event in event_stream:
            if 'chunk' in event:
                data = event['chunk']['bytes']
                if enable_trace:
                    decoded_data = data.decode("utf8")
                    logger.info(f"Final answer -> {decoded_data}")
                    logger.info("")
                    for key in event["chunk"]:
                        if key != "bytes":
                            logger.info(f"Chunk {key}:")
                            logger.info(json.dumps(event["chunk"][key], indent=3))
                agent_answer = data.decode("utf8")
                return agent_answer
            elif 'trace' in event:
                if enable_trace:
                    logger.info(json.dumps(event['trace'], indent=2))
            else:
                raise Exception("unexpected event.", event)
    except Exception as e:
        raise Exception("unexpected event.", e)

def clean_up_resources(
    table_name,
    lambda_function,
    lambda_function_name,
    agent_action_group_response,
    agent_functions,
    agent_id,
    kb_id,
    alias_id
):
    action_group_id = agent_action_group_response['agentActionGroup']['actionGroupId']
    action_group_name = agent_action_group_response['agentActionGroup']['actionGroupName']
    try:
        bedrock_agent_client.update_agent_action_group(
            agentId=agent_id,
            agentVersion='DRAFT',
            actionGroupId=action_group_id,
            actionGroupName=action_group_name,
            actionGroupExecutor={'lambda': lambda_function['FunctionArn']},
            functionSchema={'functions': agent_functions},
            actionGroupState='TO_COLLABORATOR',
        )
        bedrock_agent_client.disassociate_agent_knowledge_base(
            agentId=agent_id,
            agentVersion='DRAFT',
            knowledgeBaseId=kb_id
        )
        bedrock_agent_client.delete_agent_action_group(
            agentId=agent_id,
            agentVersion='DRAFT',
            actionGroupId=action_group_id
        )
        bedrock_agent_client.delete_agent(agentId=agent_id)
        print(
            f"Agent {agent_id}, Agent Alias {alias_id}, and Action Group have been deleted."
        )
    except Exception as e:
        print(f"Error deleting Agent resources: {e}")

    try:
        lambda_client.delete_function(FunctionName=lambda_function_name)
        print(f"Lambda function {lambda_function_name} has been deleted.")
    except Exception as e:
        print(f"Error deleting Lambda function {lambda_function_name}: {e}")

    try:
        dynamodb_client.delete_table(TableName=table_name)
        print(f"Table {table_name} is being deleted...")
        waiter = dynamodb_client.get_waiter('table_not_exists')
        waiter.wait(TableName=table_name)
        print(f"Table {table_name} has been deleted.")
    except Exception as e:
        print(f"Error deleting table {table_name}: {e}")

def generate_random_suffix():
    """Generate a random 5-character suffix."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))

def get_bedrock_inference_policy(account_id, region):
    """Create the Bedrock inference policy document."""
    random_suffix = generate_random_suffix()
    return {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AmazonBedrockAgentInferenceProfilesCrossRegionPolicyProd",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:GetInferenceProfile",
                "bedrock:GetFoundationModel"
            ],
            "Resource": [
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-lite-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0",
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-micro-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-micro-v1:0",
                f"arn:aws:bedrock:us-west-2:{account_id}:inference-profile/us.amazon.nova-pro-v1:0",
                "arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0",
                "arn:aws:bedrock:us-west-2::foundation-model/*"
            ]
        }
    ]
}, f"BedrockAgentInferenceProfilesCrossRegionPolicy_{random_suffix}"