import os
from time import sleep

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import BedrockAgentResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
app = BedrockAgentResolver()

athena_client = boto3.client("athena")


@app.post("/athenaQuery", description="Execute a query on an Athena database")
def athena_query_handler():
    # session_attributes = app.current_event.session_attributes
    properties = app.current_event.request_body.content.get(
        "application/json"
    ).properties
    try:
        query = properties[0]["value"]
        print("Received QUERY:", query)
        query = query.lower()
        s3_output = os.getenv("ATHENA_RESULTS_BUCKET_PATH")
        if isinstance(s3_output, dict) and "error" in s3_output:
            return s3_output
        execution_id = execute_athena_query(query, s3_output)
        result = get_query_results(execution_id)
        return {"result": result}
    except Exception as e:
        print(f"Error during Athena query: {str(e)}")
        return {"error": f"Athena query execution failed: {str(e)}"}


def execute_athena_query(query, s3_output):  # nosec
    try:
        response = athena_client.start_query_execution(
            QueryString=query, ResultConfiguration={"OutputLocation": s3_output}
        )
        return response["QueryExecutionId"]
    except Exception as e:
        print(f"Error starting Athena query: {str(e)}")
        raise Exception(f"Error starting Athena query: {str(e)}")


def check_query_status(execution_id):
    try:
        response = athena_client.get_query_execution(QueryExecutionId=execution_id)
        return response["QueryExecution"]["Status"]["State"]
    except Exception as e:
        print(f"Error checking query status: {str(e)}")
        raise Exception(f"Error checking query status: {str(e)}")


def get_query_results(execution_id):  # nosec
    try:
        while True:
            status = check_query_status(execution_id)
            if status in ["SUCCEEDED", "FAILED", "CANCELLED"]:
                break
            sleep(1)  # nosemgrep: arbitrary-sleep
        if status == "SUCCEEDED":
            return athena_client.get_query_results(QueryExecutionId=execution_id)
        else:
            raise Exception(f"Query failed with status '{status}'")
    except Exception as e:
        print(f"Error retrieving query results: {str(e)}")
        raise Exception(f"Error retrieving query results: {str(e)}")


@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext):
    print(event)
    return app.resolve(event, context)
