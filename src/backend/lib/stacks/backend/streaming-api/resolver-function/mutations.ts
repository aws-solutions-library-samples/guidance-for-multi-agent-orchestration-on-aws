/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./types";
type GeneratedMutation<InputType, OutputType> = string & {
    __generatedMutationInput: InputType;
    __generatedMutationOutput: OutputType;
};

export const sendChat = /* GraphQL */ `mutation SendChat(
  $sessionId: String!
  $human: String!
  $sessionAttributes: AWSJSON
) {
  sendChat(
    sessionId: $sessionId
    human: $human
    sessionAttributes: $sessionAttributes
  )
}
` as GeneratedMutation<APITypes.SendChatMutationVariables, APITypes.SendChatMutation>;
export const createChat = /* GraphQL */ `mutation CreateChat(
  $input: CreateChatInput!
  $condition: ModelChatConditionInput
) {
  createChat(input: $input, condition: $condition) {
    userId
    sessionId
    human
    assistant
    trace
    expiration
    id
    createdAt
    updatedAt
    sessionChatsId
    __typename
  }
}
` as GeneratedMutation<APITypes.CreateChatMutationVariables, APITypes.CreateChatMutation>;
export const updateChat = /* GraphQL */ `mutation UpdateChat(
  $input: UpdateChatInput!
  $condition: ModelChatConditionInput
) {
  updateChat(input: $input, condition: $condition) {
    userId
    sessionId
    human
    assistant
    trace
    expiration
    id
    createdAt
    updatedAt
    sessionChatsId
    __typename
  }
}
` as GeneratedMutation<APITypes.UpdateChatMutationVariables, APITypes.UpdateChatMutation>;
export const deleteChat = /* GraphQL */ `mutation DeleteChat(
  $input: DeleteChatInput!
  $condition: ModelChatConditionInput
) {
  deleteChat(input: $input, condition: $condition) {
    userId
    sessionId
    human
    assistant
    trace
    expiration
    id
    createdAt
    updatedAt
    sessionChatsId
    __typename
  }
}
` as GeneratedMutation<APITypes.DeleteChatMutationVariables, APITypes.DeleteChatMutation>;
export const createSession = /* GraphQL */ `mutation CreateSession(
  $input: CreateSessionInput!
  $condition: ModelSessionConditionInput
) {
  createSession(input: $input, condition: $condition) {
    userId
    chats {
      nextToken
      __typename
    }
    expiration
    id
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<APITypes.CreateSessionMutationVariables, APITypes.CreateSessionMutation>;
export const updateSession = /* GraphQL */ `mutation UpdateSession(
  $input: UpdateSessionInput!
  $condition: ModelSessionConditionInput
) {
  updateSession(input: $input, condition: $condition) {
    userId
    chats {
      nextToken
      __typename
    }
    expiration
    id
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<APITypes.UpdateSessionMutationVariables, APITypes.UpdateSessionMutation>;
export const deleteSession = /* GraphQL */ `mutation DeleteSession(
  $input: DeleteSessionInput!
  $condition: ModelSessionConditionInput
) {
  deleteSession(input: $input, condition: $condition) {
    userId
    chats {
      nextToken
      __typename
    }
    expiration
    id
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<APITypes.DeleteSessionMutationVariables, APITypes.DeleteSessionMutation>;
