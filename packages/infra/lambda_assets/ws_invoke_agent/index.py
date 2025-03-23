import json
import logging
import boto3
import datetime
from botocore.exceptions import ClientError

# Initialize clients and set up logging
agents_runtime_client = boto3.client('bedrock-agent-runtime')
dynamodb = boto3.resource('dynamodb')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        elif isinstance(obj, datetime.date):
            return obj.isoformat()
        # Handle bytes objects (sometimes returned by AWS API responses)
        elif isinstance(obj, bytes):
            try:
                return obj.decode('utf-8')
            except:
                return str(obj)
        # Try to convert other non-serializable objects to strings
        try:
            return super(DateTimeEncoder, self).default(obj)
        except TypeError:
            # If all else fails, convert to string
            return str(obj)

# DynamoDB table to store connection IDs
CONNECTIONS_TABLE = 'WebSocketConnections'  # Replace with your table name

def lambda_handler(event, context):
    route_key = event['requestContext']['routeKey']
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']

    if route_key == '$connect':
        return handle_connect(connection_id)
    elif route_key == '$disconnect':
        return handle_disconnect(connection_id)
    elif route_key == 'sendMessage':
        return handle_send_message(event, connection_id, domain_name, stage)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid route'})
        }

def handle_connect(connection_id):
    table = dynamodb.Table(CONNECTIONS_TABLE)
    try:
        table.put_item(Item={'ConnectionId': connection_id})
        logger.info(f"Connection {connection_id} added.")
        return {'statusCode': 200, 'body': json.dumps({'message': 'Connected'})}
    except ClientError as e:
        logger.error(f"Error adding connection {connection_id}: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def handle_disconnect(connection_id):
    table = dynamodb.Table(CONNECTIONS_TABLE)
    try:
        table.delete_item(Key={'ConnectionId': connection_id})
        logger.info(f"Connection {connection_id} deleted.")
        return {'statusCode': 200, 'body': json.dumps({'message': 'Disconnected'})}
    except ClientError as e:
        logger.error(f"Error deleting connection {connection_id}: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def handle_send_message(event, connection_id, domain_name, stage):
    try:
        body = json.loads(event['body'])
        prompt = body.get('prompt')
        if not prompt:
            raise ValueError("Missing 'prompt' in request body")

        call_agent_and_stream(event, prompt, connection_id, domain_name, stage)
        return {'statusCode': 200, 'body': json.dumps({'message': 'Message sent'})}
    except Exception as e:
        logger.error(f"Error handling sendMessage: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def send_to_client(connection_id, message, domain_name, stage):
    gateway_url = f"https://{domain_name}/{stage}"
    apigw_client = boto3.client('apigatewaymanagementapi', endpoint_url=gateway_url)

    try:
        # Use the custom DateTimeEncoder to handle datetime objects
        apigw_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, cls=DateTimeEncoder).encode('utf-8')
        )
        logger.info(f"Message sent to {connection_id}: {message}")
    except ClientError as e:
        logger.error(f"Error sending message to {connection_id}: {e}")
        # Log for disconnected connections
        if e.response['Error']['Code'] == 'GoneException':
            logger.warning(f"Connection {connection_id} is invalid (GoneException).")
        else:
            raise

def call_agent_and_stream(event, prompt, connection_id, domain_name, stage):
    # Get agent-specific data from the event body
    body = json.loads(event['body'])
    agent_id = body.get('agentId', '')  # Default if not provided
    agent_alias_id = body.get('aliasId', '')  # Default if not provided
    session_id = body.get('sessionId', 'MYSESSION')  # Default if not provided

    try:
        response = agents_runtime_client.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=prompt,
            enableTrace=True  # Enable tracing
        )

        completion = ""

        for event_item in response['completion']:
            if 'chunk' in event_item:
                chunk = event_item['chunk']
                if 'bytes' in chunk:
                    chunk_data = chunk['bytes'].decode()
                    completion += chunk_data
                    send_to_client(
                        connection_id,
                        {"type": "chunk", "content": chunk_data},
                        domain_name,
                        stage
                    )
            elif 'trace' in event_item:
                trace_event = event_item['trace']
                # Pre-serialize the trace event to handle any datetime objects
                try:
                    # Convert any datetime objects to ISO format strings
                    trace_event_serialized = json.loads(json.dumps(trace_event, cls=DateTimeEncoder))
                    trace_data = {
                        "type": "trace",
                        "traceType": trace_event_serialized.get("traceType", "Unknown"),
                        "content": trace_event_serialized
                    }
                    send_to_client(connection_id, trace_data, domain_name, stage)
                except Exception as e:
                    logger.error(f"Error serializing trace event: {str(e)}")
                    # Send a simplified trace event without the problematic fields
                    simplified_trace = {
                        "type": "trace",
                        "traceType": trace_event.get("traceType", "Unknown"),
                        "simplified": True
                    }
                    send_to_client(connection_id, simplified_trace, domain_name, stage)

        # Send final
        send_to_client(
            connection_id,
            {"type": "final", "content": completion},
            domain_name,
            stage
        )

    except Exception as e:
        # Get the error details, ensuring we don't include any datetime objects
        error_message = f"Error in agent call: {str(e)}"
        logger.error(error_message)
        
        # Make sure the error message is serializable
        try:
            # Test serialization first
            json.dumps({"test": error_message}, cls=DateTimeEncoder)
            
            # Send JSON error to client
            send_to_client(
                connection_id,
                {"type": "error", "message": error_message},
                domain_name,
                stage
            )
        except Exception as serialize_error:
            # If even the error message can't be serialized, send a generic error
            logger.error(f"Error serializing error message: {str(serialize_error)}")
            send_to_client(
                connection_id,
                {"type": "error", "message": "An error occurred processing your request"},
                domain_name,
                stage
            )
        
        raise  # Reraise to be caught in handle_send_message if needed
