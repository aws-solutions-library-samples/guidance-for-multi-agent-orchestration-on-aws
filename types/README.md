# Custom Type Declarations

This directory contains custom type declarations to fix type conflicts and provide missing typings:

## Files

- `graphql.d.ts`: Fixes GraphQL type conflicts between different library versions by adding the missing `toJSON()` method to the Location interface
- `redux-offline.d.ts`: Provides missing typings for @redux-offline/redux-offline
- `index.d.ts`: Imports all custom type declarations

## Purpose

These declarations help resolve TypeScript errors related to:

1. Conflicts between different versions of GraphQL libraries (particularly with apollo-cache-inmemory)
2. Missing type definitions for third-party libraries

## Usage

These declarations are automatically loaded by TypeScript because they're included in the project's TypeScript configuration. No additional import statements are needed in your code.