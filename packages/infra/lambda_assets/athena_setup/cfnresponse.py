# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import urllib.request
import urllib.parse

SUCCESS = "SUCCESS"
FAILED = "FAILED"

def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False):
    responseUrl = event['ResponseURL']

    print(responseUrl)

    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['NoEcho'] = noEcho
    responseBody['Data'] = responseData

    json_responseBody = json.dumps(responseBody)

    print("Response body:\n" + json_responseBody)

    headers = {
        'content-type' : '',
        'content-length' : str(len(json_responseBody))
    }

    try:
        req = urllib.request.Request(responseUrl, json_responseBody.encode('utf-8'), headers)
        response = urllib.request.urlopen(req)
        print("Status code: " + response.reason)
        return True
    except Exception as e:
        print("send(..) failed executing requests.request(..): " + str(e))
        return False