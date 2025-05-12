import boto3
from time import sleep

athena_client = boto3.client('athena')
ssm_client = boto3.client('ssm')

def get_s3_bucket_from_ssm():
    try:
        # Try the standard parameter name first
        try:
            response = ssm_client.get_parameter(
                Name='/athena/query-results-location',
                WithDecryption=True
            )
            print("Found parameter at /athena/query-results-location")
            return response['Parameter']['Value']
        except ssm_client.exceptions.ParameterNotFound:
            # Try the alternate parameter name
            try:
                response = ssm_client.get_parameter(
                    Name='/athena-bucket',
                    WithDecryption=True
                )
                print("Found parameter at /athena-bucket")
                return response['Parameter']['Value']
            except ssm_client.exceptions.ParameterNotFound:
                # Try to list parameters with prefix to see what's available
                print("Both parameters not found, listing available athena parameters...")
                params = ssm_client.describe_parameters(
                    ParameterFilters=[
                        {
                            'Key': 'Name',
                            'Option': 'BeginsWith',
                            'Values': ['/athena']
                        }
                    ]
                )
                
                if 'Parameters' in params and params['Parameters']:
                    # Use the first parameter with /athena prefix
                    param_name = params['Parameters'][0]['Name']
                    print(f"Found alternate parameter: {param_name}")
                    response = ssm_client.get_parameter(
                        Name=param_name,
                        WithDecryption=True
                    )
                    return response['Parameter']['Value']
                else:
                    raise Exception("No Athena parameters found in SSM")
        
    except Exception as e:
        print(f"Error retrieving S3 bucket from SSM: {str(e)}")
        
        # If the parameter is not found, create a default using account ID
        try:
            sts_client = boto3.client('sts')
            account_id = sts_client.get_caller_identity()['Account']
            region = boto3.session.Session().region_name
            bucket_name = f'genai-athena-output-bucket-{account_id}-{region}'
            output_location = f's3://{bucket_name}/'
            
            # Verify the S3 bucket exists
            s3_client = boto3.client('s3')
            try:
                s3_client.head_bucket(Bucket=bucket_name)
                print(f"Using existing bucket: {bucket_name}")
            except s3_client.exceptions.ClientError:
                print(f"Bucket {bucket_name} doesn't exist or is not accessible")
                return {"error": f"Athena output bucket {bucket_name} not accessible"}
            
            # Store the bucket name in SSM for future use
            ssm_client.put_parameter(
                Name='/athena/query-results-location',
                Value=output_location,
                Type='SecureString',
                Overwrite=True
            )
            print(f"Created new parameter /athena/query-results-location with value {output_location}")
            
            # Configure Athena workgroup
            try:
                athena_client.update_work_group(
                    WorkGroup='primary',
                    Description='Updated by athena_query_tool Lambda',
                    Configuration={
                        'ResultConfiguration': {
                            'OutputLocation': output_location,
                        },
                        'EnforceWorkGroupConfiguration': True,
                    }
                )
                print(f"Successfully configured Athena primary workgroup with output location: {output_location}")
            except Exception as wg_error:
                print(f"Warning: Could not update workgroup: {str(wg_error)}")
            
            return output_location
            
        except Exception as e:
            print(f"Error creating parameter and configuring Athena: {str(e)}")
            return {"error": f"Failed to configure Athena query results location: {str(e)}"}

def lambda_handler(event, context):
    print(event)

    def athena_query_handler(event):
        try:
            query = event['requestBody']['content']['application/json']['properties'][0]['value']
            print("Received QUERY:", query)
            query = query.lower()
            s3_output = get_s3_bucket_from_ssm()
            if isinstance(s3_output, dict) and "error" in s3_output:
                print("Cannot execute query - Athena query results location not configured")
                return s3_output
            execution_id = execute_athena_query(query, s3_output)
            result = get_query_results(execution_id)
            return {"result": result}
        except Exception as e:
            print(f"Error during Athena query: {str(e)}")
            return {"error": f"Athena query execution failed: {str(e)}"}

    def execute_athena_query(query, s3_output):# nosec
        try:
            # Verify workgroup configuration first
            workgroup_config = athena_client.get_work_group(WorkGroup='primary')
            workgroup_location = workgroup_config.get('WorkGroup', {}).get('Configuration', {}).get('ResultConfiguration', {}).get('OutputLocation')
            if workgroup_location != s3_output:
                print(f"Warning: Workgroup output location ({workgroup_location}) differs from expected ({s3_output})")
            
            # Execute the query
            response = athena_client.start_query_execution(
                QueryString=query,
                WorkGroup='primary',
                ResultConfiguration={'OutputLocation': s3_output}
            )
            return response['QueryExecutionId']
        except Exception as e:
            print(f"Error executing Athena query: {str(e)}")
            raise Exception(f"Error executing Athena query: {str(e)}")

    def check_query_status(execution_id):
        try:
            response = athena_client.get_query_execution(QueryExecutionId=execution_id)
            return response['QueryExecution']['Status']['State']
        except Exception as e:
            print(f"Error checking query status: {str(e)}")
            raise Exception(f"Error checking query status: {str(e)}")

    def get_query_results(execution_id):# nosec
        try:
            while True:
                status = check_query_status(execution_id)
                if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                    break
                sleep(1)# nosemgrep: arbitrary-sleep
            if status == 'SUCCEEDED':
                return athena_client.get_query_results(QueryExecutionId=execution_id)
            else:
                raise Exception(f"Query failed with status '{status}'")
        except Exception as e:
            print(f"Error retrieving query results: {str(e)}")
            raise Exception(f"Error retrieving query results: {str(e)}")

    action_group = event.get('actionGroup')
    api_path = event.get('apiPath')
    print("api_path: ", api_path)

    if api_path == '/athenaQuery':
        result = athena_query_handler(event)
        response_code = 200
    else:
        response_code = 404
        result = {"error": f"Unrecognized api path: {api_path}"}

    response_body = {'application/json': {'body': result}}
    action_response = {
        'actionGroup': action_group,
        'apiPath': api_path,
        'httpMethod': event.get('httpMethod'),
        'httpStatusCode': response_code,
        'responseBody': response_body
    }

    return {'messageVersion': '1.0', 'response': action_response}
