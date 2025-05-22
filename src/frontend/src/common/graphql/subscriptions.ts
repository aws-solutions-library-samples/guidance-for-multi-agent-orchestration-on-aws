/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./types";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateChat = /* GraphQL */ `subscription OnCreateChat(
  $filter: ModelSubscriptionChatFilterInput
  $userId: String
) {
  onCreateChat(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnCreateChatSubscriptionVariables,
  APITypes.OnCreateChatSubscription
>;
export const onUpdateChat = /* GraphQL */ `subscription OnUpdateChat(
  $filter: ModelSubscriptionChatFilterInput
  $userId: String
) {
  onUpdateChat(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateChatSubscriptionVariables,
  APITypes.OnUpdateChatSubscription
>;
export const onDeleteChat = /* GraphQL */ `subscription OnDeleteChat(
  $filter: ModelSubscriptionChatFilterInput
  $userId: String
) {
  onDeleteChat(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteChatSubscriptionVariables,
  APITypes.OnDeleteChatSubscription
>;
export const onCreateSession = /* GraphQL */ `subscription OnCreateSession(
  $filter: ModelSubscriptionSessionFilterInput
  $userId: String
) {
  onCreateSession(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnCreateSessionSubscriptionVariables,
  APITypes.OnCreateSessionSubscription
>;
export const onUpdateSession = /* GraphQL */ `subscription OnUpdateSession(
  $filter: ModelSubscriptionSessionFilterInput
  $userId: String
) {
  onUpdateSession(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateSessionSubscriptionVariables,
  APITypes.OnUpdateSessionSubscription
>;
export const onDeleteSession = /* GraphQL */ `subscription OnDeleteSession(
  $filter: ModelSubscriptionSessionFilterInput
  $userId: String
) {
  onDeleteSession(filter: $filter, userId: $userId) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteSessionSubscriptionVariables,
  APITypes.OnDeleteSessionSubscription
>;
