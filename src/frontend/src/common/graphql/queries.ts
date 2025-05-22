/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./types";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getChat = /* GraphQL */ `query GetChat($id: ID!) {
  getChat(id: $id) {
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
` as GeneratedQuery<APITypes.GetChatQueryVariables, APITypes.GetChatQuery>;
export const listChats = /* GraphQL */ `query ListChats(
  $filter: ModelChatFilterInput
  $limit: Int
  $nextToken: String
) {
  listChats(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListChatsQueryVariables, APITypes.ListChatsQuery>;
export const chatsBySessionId = /* GraphQL */ `query ChatsBySessionId(
  $sessionId: String!
  $sortDirection: ModelSortDirection
  $filter: ModelChatFilterInput
  $limit: Int
  $nextToken: String
) {
  chatsBySessionId(
    sessionId: $sessionId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ChatsBySessionIdQueryVariables,
  APITypes.ChatsBySessionIdQuery
>;
export const getSession = /* GraphQL */ `query GetSession($id: ID!) {
  getSession(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetSessionQueryVariables,
  APITypes.GetSessionQuery
>;
export const listSessions = /* GraphQL */ `query ListSessions(
  $filter: ModelSessionFilterInput
  $limit: Int
  $nextToken: String
) {
  listSessions(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      userId
      expiration
      id
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListSessionsQueryVariables,
  APITypes.ListSessionsQuery
>;
