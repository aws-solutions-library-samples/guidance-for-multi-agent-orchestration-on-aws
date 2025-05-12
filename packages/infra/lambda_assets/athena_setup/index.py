import boto3
import time
import os
import json
import urllib.request
# Using local cfnresponse.py instead of the import
from cfnresponse import send, SUCCESS, FAILED

athena = boto3.client('athena')
ssm_client = boto3.client('ssm')

def wait_for_ssm_parameter(parameter_name, max_attempts=10):
    """Wait for SSM parameter to be available"""
    for i in range(max_attempts):
        try:
            ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
            print(f"SSM parameter {parameter_name} is available")
            return True
        except ssm_client.exceptions.ParameterNotFound:
            print(f"Waiting for SSM parameter {parameter_name} to be available (attempt {i+1}/{max_attempts})")
            time.sleep(5)
    return False

def configure_workgroup(workgroup_name, output_location):
    """Configure Athena workgroup with the specified output location"""
    print(f"Configuring workgroup {workgroup_name} with output location {output_location}")
    try:
        # Get current configuration
        workgroup_config = athena.get_work_group(WorkGroup=workgroup_name)
        current_location = workgroup_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
        
        print(f"Current workgroup configuration: {workgroup_config}")
        
        # Always update the workgroup to ensure it's configured correctly
        print(f"Updating workgroup output location from {current_location} to {output_location}")
        athena.update_work_group(
            WorkGroup=workgroup_name,
            Description='Updated by MAC demo deployment',
            ConfigurationUpdates={
                'ResultConfigurationUpdates': {
                    'OutputLocation': output_location
                },
                'EnforceWorkGroupConfiguration': True,
                'PublishCloudWatchMetricsEnabled': True,
                'RequesterPaysEnabled': False
            }
        )
        
        # Verify the configuration was applied
        updated_config = athena.get_work_group(WorkGroup=workgroup_name)
        updated_location = updated_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
        
        print(f"Verified workgroup configuration after update: {updated_config}")
        
        if updated_location == output_location:
            print(f"Successfully verified workgroup {workgroup_name} was updated with output location {output_location}")
        else:
            print(f"WARNING: Workgroup update was performed but verification shows different location: {updated_location}")
            
        return True
    except Exception as e:
        print(f"Error configuring workgroup: {str(e)}")
        raise

# This is the main handler that will be called by the Lambda
def lambda_handler(event, context):
    print(f"Received event: {event}")
    try:
        if event['RequestType'] in ['Create', 'Update']:
            print("Setting up Athena resources...")
            
            # Get the parameter name from environment or use a default
            parameter_name = os.environ.get('ATHENA_PARAMETER_NAME', '/athena/query-results-location')
            print(f"Using SSM parameter '{parameter_name}' for Athena configuration")
            
            # First ensure SSM parameter exists
            print(f"Waiting for SSM parameter '{parameter_name}' to be available...")
            if not wait_for_ssm_parameter(parameter_name):
                raise Exception(f"Timed out waiting for SSM parameter '{parameter_name}' to be available")
            
            # Get and validate output location from environment or SSM
            output_location = os.environ.get('ATHENA_RESULTS_LOCATION')
            if not output_location:
                try:
                    # Try to get from SSM as fallback
                    ssm_client = boto3.client('ssm')
                    ssm_response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
                    output_location = ssm_response['Parameter']['Value']
                    print(f"Got output location from SSM parameter '{parameter_name}': {output_location}")
                except Exception as e:
                    print(f"Error getting output location from SSM: {str(e)}")
                    raise Exception("ATHENA_RESULTS_LOCATION environment variable not set and SSM lookup failed")
            
            print(f"Using Athena results location: {output_location}")
            
            # Configure default workgroup and verify configuration
            workgroup_name = 'primary'
            
            # Check if workgroup is already configured with correct location
            try:
                workgroup_config = athena.get_work_group(WorkGroup=workgroup_name)
                current_location = workgroup_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
                print(f"Current workgroup output location: {current_location}")
                
                # If workgroup is not correctly configured, update it
                if current_location != output_location:
                    print(f"Workgroup needs to be updated from {current_location} to {output_location}")
                    
                    for attempt in range(5):  # Try up to 5 times to be more resilient
                        try:
                            configure_workgroup(workgroup_name, output_location)
                            # Verify configuration
                            workgroup_config = athena.get_work_group(WorkGroup=workgroup_name)
                            current_location = workgroup_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
                            if current_location == output_location:
                                print("✅ Workgroup configuration verified successfully")
                                break
                            print(f"⚠️ Workgroup configuration not yet updated (attempt {attempt + 1}/5)")
                            time.sleep(10)  # Wait longer between attempts
                        except Exception as e:
                            if attempt == 4:  # Last attempt
                                raise Exception(f"Failed to configure workgroup after 5 attempts: {str(e)}")
                            print(f"Error configuring workgroup (attempt {attempt + 1}/5): {str(e)}")
                            time.sleep(10)
                else:
                    print(f"✅ Workgroup '{workgroup_name}' already has the correct output location: {output_location}")
            except Exception as e:
                print(f"Error checking workgroup configuration: {str(e)}")
                raise
            
            # IMPORTANT: Verify workgroup configuration is correct before proceeding
            final_check = athena.get_work_group(WorkGroup=workgroup_name)
            final_location = final_check.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
            if final_location != output_location:
                error_msg = f"❌ CRITICAL ERROR: Workgroup output location is still incorrect. Expected: {output_location}, Actual: {final_location}"
                print(error_msg)
                raise Exception(error_msg)
                
            print("✅ Final verification passed - workgroup configuration is correct")
            
            # Set up database and tables
            database_name = 'personalization_data'
            
            print(f"Using database: {database_name}")
            print(f"Using Athena results location: {output_location}")
            
            # Create database
            create_db_query = f'CREATE DATABASE IF NOT EXISTS {database_name}'
            execute_query(create_db_query, output_location)
            
            # Create your tables here
            # Example:
            create_table_query = '''
            CREATE TABLE IF NOT EXISTS personalization_data.user_preferences (
                user_id STRING,
                preference_type STRING,
                preference_value STRING
            )
            '''
            execute_query(create_table_query, output_location)
            
            print("✅ All Athena setup completed successfully")
            send(event, context, SUCCESS, {"Status": "Athena setup completed successfully"})
        else:
            send(event, context, SUCCESS, {"Status": "No action needed for Delete event"})
    except Exception as e:
        error_message = f"❌ Error: {str(e)}"
        print(error_message)
        send(event, context, FAILED, {"Error": error_message})

def execute_query(query, output_location):
    print(f"Executing query: {query}")
    print(f"Using output location: {output_location}")
    try:
        # Verify workgroup configuration
        workgroup_config = athena.get_work_group(WorkGroup='primary')
        workgroup_location = workgroup_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
        
        if not workgroup_location:
            print("Warning: Workgroup has no output location configured, using provided location")
        elif workgroup_location != output_location:
            print(f"Warning: Current workgroup location ({workgroup_location}) differs from expected ({output_location})")
            
        # Execute query with workgroup and explicit output location
        response = athena.start_query_execution(
            QueryString=query,
            WorkGroup='primary',
            ResultConfiguration={'OutputLocation': output_location}
        )
        query_execution_id = response['QueryExecutionId']
        
        # Wait for query completion
        while True:
            query_status = athena.get_query_execution(QueryExecutionId=query_execution_id)
            state = query_status['QueryExecution']['Status']['State']
            if state in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                break
            time.sleep(1)
            
        if state != 'SUCCEEDED':
            error_info = query_status['QueryExecution'].get('Status', {}).get('StateChangeReason', 'Unknown error')
            raise Exception(f"Query failed with state: {state}. Reason: {error_info}")
    except Exception as e:
        raise Exception(f"Failed to execute query: {str(e)}")