import boto3
import json
import logging
import os
import time
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent = boto3.client('bedrock-agent')

def lambda_handler(event, context):
    """
    Lambda function to check the status of knowledge bases and their ingestion jobs.
    If no recent successful ingestion job is found, a new one is started.
    
    Event example:
    {
        "knowledgeBaseIds": [
            "knowledge-base-id-1",
            "knowledge-base-id-2"
        ]
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    knowledge_base_ids = []
    
    # Check if knowledgeBaseIds were provided in the event
    if 'knowledgeBaseIds' in event:
        knowledge_base_ids = event['knowledgeBaseIds']
    
    # If no KBs provided, list all knowledge bases
    if not knowledge_base_ids:
        try:
            response = bedrock_agent.list_knowledge_bases()
            knowledge_base_ids = [kb['knowledgeBaseId'] for kb in response.get('knowledgeBaseSummaries', [])]
            logger.info(f"Found {len(knowledge_base_ids)} knowledge bases")
        except Exception as e:
            logger.error(f"Error listing knowledge bases: {str(e)}")
            return {
                'statusCode': 500,
                'body': f"Error listing knowledge bases: {str(e)}"
            }
    
    results = {}
    
    # Check each knowledge base
    for kb_id in knowledge_base_ids:
        try:
            # Get the knowledge base details
            kb_details = bedrock_agent.get_knowledge_base(knowledgeBaseId=kb_id)
            kb_name = kb_details.get('name', 'Unknown')
            
            # List data sources for this knowledge base
            data_sources = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
            data_source_ids = [ds['dataSourceId'] for ds in data_sources.get('dataSourceSummaries', [])]
            
            logger.info(f"Knowledge Base: {kb_name} ({kb_id}) has {len(data_source_ids)} data sources")
            
            kb_results = []
            
            # For each data source, check ingestion jobs
            for ds_id in data_source_ids:
                ds_details = bedrock_agent.get_data_source(
                    knowledgeBaseId=kb_id,
                    dataSourceId=ds_id
                )
                ds_name = ds_details.get('name', 'Unknown')
                
                # List ingestion jobs for this data source
                ingestion_jobs = bedrock_agent.list_ingestion_jobs(
                    knowledgeBaseId=kb_id,
                    dataSourceId=ds_id
                )
                
                # Check for recent successful jobs (within last 24 hours)
                recent_success = False
                one_day_ago = datetime.now() - timedelta(days=1)
                
                for job in ingestion_jobs.get('ingestionJobSummaries', []):
                    if job.get('status') == 'COMPLETE' and job.get('completedAt', datetime.min) > one_day_ago:
                        recent_success = True
                        break
                
                # If no recent successful job, start a new one
                if not recent_success:
                    logger.info(f"No recent successful ingestion job for data source {ds_name} ({ds_id}). Starting new job.")
                    
                    try:
                        new_job = bedrock_agent.start_ingestion_job(
                            knowledgeBaseId=kb_id,
                            dataSourceId=ds_id
                        )
                        job_id = new_job.get('ingestionJobId')
                        logger.info(f"Started new ingestion job {job_id}")
                        kb_results.append({
                            'dataSourceId': ds_id,
                            'dataSourceName': ds_name,
                            'action': 'STARTED_INGESTION',
                            'jobId': job_id
                        })
                    except Exception as e:
                        logger.error(f"Error starting ingestion job: {str(e)}")
                        kb_results.append({
                            'dataSourceId': ds_id,
                            'dataSourceName': ds_name,
                            'action': 'ERROR',
                            'error': str(e)
                        })
                else:
                    logger.info(f"Recent successful ingestion job found for data source {ds_name} ({ds_id})")
                    kb_results.append({
                        'dataSourceId': ds_id,
                        'dataSourceName': ds_name,
                        'action': 'NONE',
                        'reason': 'RECENT_SUCCESS'
                    })
            
            results[kb_id] = {
                'knowledgeBaseName': kb_name,
                'dataSources': kb_results
            }
            
        except Exception as e:
            logger.error(f"Error processing knowledge base {kb_id}: {str(e)}")
            results[kb_id] = {
                'error': str(e)
            }
    
    return {
        'statusCode': 200,
        'body': results
    }