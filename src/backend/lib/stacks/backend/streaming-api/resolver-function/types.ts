/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateChatInput = {
    userId?: string | null;
    sessionId: string;
    human?: string | null;
    assistant?: string | null;
    trace?: string | null;
    expiration?: number | null;
    id?: string | null;
    sessionChatsId?: string | null;
};

export type ModelChatConditionInput = {
    userId?: ModelIDInput | null;
    sessionId?: ModelStringInput | null;
    human?: ModelStringInput | null;
    assistant?: ModelStringInput | null;
    trace?: ModelStringInput | null;
    expiration?: ModelIntInput | null;
    and?: Array<ModelChatConditionInput | null> | null;
    or?: Array<ModelChatConditionInput | null> | null;
    not?: ModelChatConditionInput | null;
    createdAt?: ModelStringInput | null;
    updatedAt?: ModelStringInput | null;
    sessionChatsId?: ModelIDInput | null;
};

export type ModelIDInput = {
    ne?: string | null;
    eq?: string | null;
    le?: string | null;
    lt?: string | null;
    ge?: string | null;
    gt?: string | null;
    contains?: string | null;
    notContains?: string | null;
    between?: Array<string | null> | null;
    beginsWith?: string | null;
    attributeExists?: boolean | null;
    attributeType?: ModelAttributeTypes | null;
    size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
    binary = "binary",
    binarySet = "binarySet",
    bool = "bool",
    list = "list",
    map = "map",
    number = "number",
    numberSet = "numberSet",
    string = "string",
    stringSet = "stringSet",
    _null = "_null",
}

export type ModelSizeInput = {
    ne?: number | null;
    eq?: number | null;
    le?: number | null;
    lt?: number | null;
    ge?: number | null;
    gt?: number | null;
    between?: Array<number | null> | null;
};

export type ModelStringInput = {
    ne?: string | null;
    eq?: string | null;
    le?: string | null;
    lt?: string | null;
    ge?: string | null;
    gt?: string | null;
    contains?: string | null;
    notContains?: string | null;
    between?: Array<string | null> | null;
    beginsWith?: string | null;
    attributeExists?: boolean | null;
    attributeType?: ModelAttributeTypes | null;
    size?: ModelSizeInput | null;
};

export type ModelIntInput = {
    ne?: number | null;
    eq?: number | null;
    le?: number | null;
    lt?: number | null;
    ge?: number | null;
    gt?: number | null;
    between?: Array<number | null> | null;
    attributeExists?: boolean | null;
    attributeType?: ModelAttributeTypes | null;
};

export type Chat = {
    __typename: "Chat";
    userId?: string | null;
    sessionId: string;
    human?: string | null;
    assistant?: string | null;
    trace?: string | null;
    expiration?: number | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    sessionChatsId?: string | null;
};

export type UpdateChatInput = {
    userId?: string | null;
    sessionId?: string | null;
    human?: string | null;
    assistant?: string | null;
    trace?: string | null;
    expiration?: number | null;
    id: string;
    sessionChatsId?: string | null;
};

export type DeleteChatInput = {
    id: string;
};

export type CreateSessionInput = {
    userId?: string | null;
    expiration?: number | null;
    id?: string | null;
};

export type ModelSessionConditionInput = {
    userId?: ModelIDInput | null;
    expiration?: ModelIntInput | null;
    and?: Array<ModelSessionConditionInput | null> | null;
    or?: Array<ModelSessionConditionInput | null> | null;
    not?: ModelSessionConditionInput | null;
    createdAt?: ModelStringInput | null;
    updatedAt?: ModelStringInput | null;
};

export type Session = {
    __typename: "Session";
    userId?: string | null;
    chats?: ModelChatConnection | null;
    expiration?: number | null;
    id: string;
    createdAt: string;
    updatedAt: string;
};

export type ModelChatConnection = {
    __typename: "ModelChatConnection";
    items: Array<Chat | null>;
    nextToken?: string | null;
};

export type UpdateSessionInput = {
    userId?: string | null;
    expiration?: number | null;
    id: string;
};

export type DeleteSessionInput = {
    id: string;
};

export type ModelChatFilterInput = {
    userId?: ModelIDInput | null;
    sessionId?: ModelStringInput | null;
    human?: ModelStringInput | null;
    assistant?: ModelStringInput | null;
    trace?: ModelStringInput | null;
    expiration?: ModelIntInput | null;
    id?: ModelIDInput | null;
    createdAt?: ModelStringInput | null;
    updatedAt?: ModelStringInput | null;
    and?: Array<ModelChatFilterInput | null> | null;
    or?: Array<ModelChatFilterInput | null> | null;
    not?: ModelChatFilterInput | null;
    sessionChatsId?: ModelIDInput | null;
};

export enum ModelSortDirection {
    ASC = "ASC",
    DESC = "DESC",
}

export type ModelSessionFilterInput = {
    userId?: ModelIDInput | null;
    expiration?: ModelIntInput | null;
    id?: ModelIDInput | null;
    createdAt?: ModelStringInput | null;
    updatedAt?: ModelStringInput | null;
    and?: Array<ModelSessionFilterInput | null> | null;
    or?: Array<ModelSessionFilterInput | null> | null;
    not?: ModelSessionFilterInput | null;
};

export type ModelSessionConnection = {
    __typename: "ModelSessionConnection";
    items: Array<Session | null>;
    nextToken?: string | null;
};

export type ModelSubscriptionChatFilterInput = {
    sessionId?: ModelSubscriptionStringInput | null;
    human?: ModelSubscriptionStringInput | null;
    assistant?: ModelSubscriptionStringInput | null;
    trace?: ModelSubscriptionStringInput | null;
    expiration?: ModelSubscriptionIntInput | null;
    id?: ModelSubscriptionIDInput | null;
    createdAt?: ModelSubscriptionStringInput | null;
    updatedAt?: ModelSubscriptionStringInput | null;
    and?: Array<ModelSubscriptionChatFilterInput | null> | null;
    or?: Array<ModelSubscriptionChatFilterInput | null> | null;
    userId?: ModelStringInput | null;
};

export type ModelSubscriptionStringInput = {
    ne?: string | null;
    eq?: string | null;
    le?: string | null;
    lt?: string | null;
    ge?: string | null;
    gt?: string | null;
    contains?: string | null;
    notContains?: string | null;
    between?: Array<string | null> | null;
    beginsWith?: string | null;
    in?: Array<string | null> | null;
    notIn?: Array<string | null> | null;
};

export type ModelSubscriptionIntInput = {
    ne?: number | null;
    eq?: number | null;
    le?: number | null;
    lt?: number | null;
    ge?: number | null;
    gt?: number | null;
    between?: Array<number | null> | null;
    in?: Array<number | null> | null;
    notIn?: Array<number | null> | null;
};

export type ModelSubscriptionIDInput = {
    ne?: string | null;
    eq?: string | null;
    le?: string | null;
    lt?: string | null;
    ge?: string | null;
    gt?: string | null;
    contains?: string | null;
    notContains?: string | null;
    between?: Array<string | null> | null;
    beginsWith?: string | null;
    in?: Array<string | null> | null;
    notIn?: Array<string | null> | null;
};

export type ModelSubscriptionSessionFilterInput = {
    expiration?: ModelSubscriptionIntInput | null;
    id?: ModelSubscriptionIDInput | null;
    createdAt?: ModelSubscriptionStringInput | null;
    updatedAt?: ModelSubscriptionStringInput | null;
    and?: Array<ModelSubscriptionSessionFilterInput | null> | null;
    or?: Array<ModelSubscriptionSessionFilterInput | null> | null;
    sessionChatsId?: ModelSubscriptionIDInput | null;
    userId?: ModelStringInput | null;
};

export type SendChatMutationVariables = {
    sessionId: string;
    human: string;
    sessionAttributes?: string | null;
};

export type SendChatMutation = {
    sendChat?: string | null;
};

export type CreateChatMutationVariables = {
    input: CreateChatInput;
    condition?: ModelChatConditionInput | null;
};

export type CreateChatMutation = {
    createChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type UpdateChatMutationVariables = {
    input: UpdateChatInput;
    condition?: ModelChatConditionInput | null;
};

export type UpdateChatMutation = {
    updateChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type DeleteChatMutationVariables = {
    input: DeleteChatInput;
    condition?: ModelChatConditionInput | null;
};

export type DeleteChatMutation = {
    deleteChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type CreateSessionMutationVariables = {
    input: CreateSessionInput;
    condition?: ModelSessionConditionInput | null;
};

export type CreateSessionMutation = {
    createSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type UpdateSessionMutationVariables = {
    input: UpdateSessionInput;
    condition?: ModelSessionConditionInput | null;
};

export type UpdateSessionMutation = {
    updateSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type DeleteSessionMutationVariables = {
    input: DeleteSessionInput;
    condition?: ModelSessionConditionInput | null;
};

export type DeleteSessionMutation = {
    deleteSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type GetChatQueryVariables = {
    id: string;
};

export type GetChatQuery = {
    getChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type ListChatsQueryVariables = {
    filter?: ModelChatFilterInput | null;
    limit?: number | null;
    nextToken?: string | null;
};

export type ListChatsQuery = {
    listChats?: {
        __typename: "ModelChatConnection";
        items: Array<{
            __typename: "Chat";
            userId?: string | null;
            sessionId: string;
            human?: string | null;
            assistant?: string | null;
            trace?: string | null;
            expiration?: number | null;
            id: string;
            createdAt: string;
            updatedAt: string;
            sessionChatsId?: string | null;
        } | null>;
        nextToken?: string | null;
    } | null;
};

export type ChatsBySessionIdQueryVariables = {
    sessionId: string;
    sortDirection?: ModelSortDirection | null;
    filter?: ModelChatFilterInput | null;
    limit?: number | null;
    nextToken?: string | null;
};

export type ChatsBySessionIdQuery = {
    chatsBySessionId?: {
        __typename: "ModelChatConnection";
        items: Array<{
            __typename: "Chat";
            userId?: string | null;
            sessionId: string;
            human?: string | null;
            assistant?: string | null;
            trace?: string | null;
            expiration?: number | null;
            id: string;
            createdAt: string;
            updatedAt: string;
            sessionChatsId?: string | null;
        } | null>;
        nextToken?: string | null;
    } | null;
};

export type GetSessionQueryVariables = {
    id: string;
};

export type GetSessionQuery = {
    getSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type ListSessionsQueryVariables = {
    filter?: ModelSessionFilterInput | null;
    limit?: number | null;
    nextToken?: string | null;
};

export type ListSessionsQuery = {
    listSessions?: {
        __typename: "ModelSessionConnection";
        items: Array<{
            __typename: "Session";
            userId?: string | null;
            expiration?: number | null;
            id: string;
            createdAt: string;
            updatedAt: string;
        } | null>;
        nextToken?: string | null;
    } | null;
};

export type OnCreateChatSubscriptionVariables = {
    filter?: ModelSubscriptionChatFilterInput | null;
    userId?: string | null;
};

export type OnCreateChatSubscription = {
    onCreateChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type OnUpdateChatSubscriptionVariables = {
    filter?: ModelSubscriptionChatFilterInput | null;
    userId?: string | null;
};

export type OnUpdateChatSubscription = {
    onUpdateChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type OnDeleteChatSubscriptionVariables = {
    filter?: ModelSubscriptionChatFilterInput | null;
    userId?: string | null;
};

export type OnDeleteChatSubscription = {
    onDeleteChat?: {
        __typename: "Chat";
        userId?: string | null;
        sessionId: string;
        human?: string | null;
        assistant?: string | null;
        trace?: string | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        sessionChatsId?: string | null;
    } | null;
};

export type OnCreateSessionSubscriptionVariables = {
    filter?: ModelSubscriptionSessionFilterInput | null;
    userId?: string | null;
};

export type OnCreateSessionSubscription = {
    onCreateSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type OnUpdateSessionSubscriptionVariables = {
    filter?: ModelSubscriptionSessionFilterInput | null;
    userId?: string | null;
};

export type OnUpdateSessionSubscription = {
    onUpdateSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type OnDeleteSessionSubscriptionVariables = {
    filter?: ModelSubscriptionSessionFilterInput | null;
    userId?: string | null;
};

export type OnDeleteSessionSubscription = {
    onDeleteSession?: {
        __typename: "Session";
        userId?: string | null;
        chats?: {
            __typename: "ModelChatConnection";
            nextToken?: string | null;
        } | null;
        expiration?: number | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};
