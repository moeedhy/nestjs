
# @moeed/nest-casl

A NestJS module for integrating CASL (Capability-based Authorization System Library) to manage permissions and authorization in your NestJS applications.

## Introduction

`@moeed/nest-casl` simplifies authorization in NestJS by leveraging CASL, a powerful capability-based authorization library. With this package, you can define fine-grained permissions (abilities) based on user roles or other criteria and protect your HTTP routes, GraphQL resolvers, or other endpoints seamlessly. It provides guards, decorators, and utilities to integrate CASL into the NestJS ecosystem with minimal boilerplate.

Key features include:
- Define abilities using CASL's fluent API.
- Protect routes or resolvers with the `AclGuard`.
- Use decorators to specify permissions and inject context data.
- Support for custom subject hooks to fetch entities dynamically.
- Compatible with HTTP, GraphQL, WebSocket, and RPC contexts.

## Installation

Install the package via npm:

```bash
npm install @moeed/nest-casl
```

**Peer Dependencies**: Ensure you have `@nestjs/common`, `@nestjs/core`, `@casl/ability`, and optionally `@nestjs/graphql` (for GraphQL support) installed in your project.

## Configuration

To use `@moeed/nest-casl`, you need to set up an ability factory and register the `AclModule` in your application.

### Step 1: Create an Ability Factory

Extend the `AbilityFactory` abstract class to define your authorization rules and extract authentication data from the request context.

```typescript
import { Injectable } from '@nestjs/common';
import { AbilityFactory, AbilityFactoryBuilder, AclActions } from '@moeed/nest-casl';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface AuthPayload {
  user?: { id: string };
}

@Injectable()
export class MyAbilityFactory extends AbilityFactory<AclActions, string, AuthPayload> {
  async defineRules(builder: AbilityFactoryBuilder<string, AclActions>, auth?: AuthPayload) {
    const { can } = builder;

    if (auth?.user?.id) {
      can(AclActions.read, 'all'); // Allow authenticated users to read everything
      can(AclActions.manage, 'Post', { authorId: auth.user.id }); // Manage own posts
    } else {
      can(AclActions.read, 'all'); // Allow guests to read everything
    }
  }

  async getAuthFromContext(context: ExecutionContext): Promise<AuthPayload | undefined> {
    const type = context.getType();
    if (type === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user; // Assumes user is set by an auth middleware
    } else if (type === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext();
      return ctx.req?.user || ctx.user;
    }
    return undefined; // Extend for 'ws' or 'rpc' if needed
  }
}
```

- **`defineRules`**: Use the CASL `AbilityBuilder` to specify what actions (e.g., `read`, `manage`) are allowed on which subjects (e.g., `'Post'`) under what conditions.
- **`getAuthFromContext`**: Extract authentication data (e.g., user info) from the context, supporting various NestJS context types.

### Step 2: Register AclModule

Import `AclModule` in your root module (`AppModule`) and provide your ability factory and any subject hooks.

```typescript
import { Module } from '@nestjs/common';
import { AclModule } from '@moeed/nest-casl';
import { MyAbilityFactory } from './my-ability.factory';
import { PostHook } from './post.hook';

@Module({
  imports: [
    AclModule.forRoot({
      abilityFactory: MyAbilityFactory,
      hookProviders: [PostHook], // Optional: Add subject hooks
    }),
  ],
})
export class AppModule {}
```

- **`hookProviders`**: Array of classes implementing `SubjectHook` for dynamic entity fetching (see "Advanced Features").
- **`abilityFactory`**: Your custom `AbilityFactory` implementation.

## Usage

Protect your routes or resolvers using the `@ACL` decorator and `AclGuard`. The package attaches auth and ability data to the request/context, making them accessible throughout the lifecycle.

### Protecting Routes

Use `@ACL` to specify required permissions and `AclGuard` to enforce them.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ACL, AclGuard } from '@moeed/nest-casl';
import { Post } from './post.entity';
import { PostHook } from './post.hook';

@Controller('posts')
@UseGuards(AclGuard)
export class PostsController {
  @Get()
  @ACL('read', 'Post') // Can user read 'Post'?
  findAll() {
    return { message: 'List of posts' };
  }

  @Get(':id')
  @ACL('read', Post, PostHook) // Can user read this specific Post?
  findOne() {
    return { message: 'Single post' };
  }
}
```

- **`@ACL(action, subject, hook?)`**:
  - `action`: Permission to check (e.g., `'read'`, `'update'`).
  - `subject`: Subject type (string like `'Post'` or class like `Post`).
  - `hook`: Optional `SubjectHook` to fetch the entity (e.g., `PostHook`).

- If a hook is provided, the guard fetches the entity and checks the permission against it. Otherwise, it checks against the subject type.

### Accessing Context Data

Use `@Subject` and `@AuthData` decorators to inject the subject entity or auth data into your handlers.

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ACL, AclGuard, Subject, AuthData } from '@moeed/nest-casl';
import { Post } from './post.entity';
import { PostHook } from './post.hook';

interface AuthPayload {
  user?: { id: string };
}

@Controller('posts')
@UseGuards(AclGuard)
export class PostsController {
  @Get(':id')
  @ACL('read', Post, PostHook)
  findOne(@Subject(Post) post: Post, @AuthData() auth: AuthPayload) {
    console.log(auth.user?.id); // Logged-in user's ID
    return post; // The fetched Post entity
  }
}
```

- **`@Subject(subject)`**: Injects the entity fetched by the hook (e.g., `post`).
- **`@AuthData()`**: Injects the auth payload (e.g., `{ user: { id: '123' } }`).

## Advanced Features

### Custom Subject Hooks

Implement `SubjectHook` to fetch entities dynamically based on request parameters.

```typescript
import { Injectable } from '@nestjs/common';
import { SubjectHook } from '@moeed/nest-casl';
import { Post } from './post.entity';
import { PostService } from './post.service';

interface AuthPayload {
  user?: { id: string };
}

@Injectable()
export class PostHook implements SubjectHook<Post, { id: string }, AuthPayload> {
  constructor(private postService: PostService) {}

  async run(params: { id: string }, auth?: AuthPayload): Promise<Post | undefined> {
    return this.postService.findOne(params.id); // Fetch post by ID
  }
}
```

- Register `PostHook` in `AclModule.forRoot({ hookProviders: [PostHook] })`.
- Use it in `@ACL('read', Post, PostHook)` to check permissions against the fetched entity.

### GraphQL Support

The package works seamlessly with GraphQL resolvers.

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ACL, AclGuard, Subject } from '@moeed/nest-casl';
import { Post } from './post.entity';
import { PostHook } from './post.hook';

@Resolver(() => Post)
@UseGuards(AclGuard)
export class PostsResolver {
  @Query(() => [Post])
  @ACL('read', 'Post')
  async posts() {
    return [{ id: '1', title: 'Example' }];
  }

  @Query(() => Post)
  @ACL('read', Post, PostHook)
  async post(@Args('id') id: string, @Subject(Post) post: Post) {
    return post;
  }
}
```

- Ensure `@nestjs/graphql` is installed and configured.
- The `AbilityFactory` handles GraphQL context automatically.

### Predefined Actions

The package provides an `AclActions` enum for common actions:

```typescript
export enum AclActions {
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
  manage = 'manage',
}
```

Use these in your `defineRules` or `@ACL` decorator, or define custom actions as strings.

## API Reference

### Core Components

- **`AbilityFactory<TAction, TSubject, TAuth>`**
  - Abstract class to define abilities and extract auth.
  - Methods: `defineRules`, `getAuthFromContext`.

- **`AclModule`**
  - Static `forRoot(options: AclModuleOptions)`: Registers the module globally.
  - Options: `{ abilityFactory: Type<AbilityFactory>, hookProviders: Type<SubjectHook>[] }`.

- **`AclGuard`**
  - Guard that enforces permissions based on `@ACL` metadata.

### Decorators

- **`@ACL(action: string, subject: Type | string, hook?: Type<SubjectHook>)`**
  - Defines permission requirements for a handler.

- **`@Subject(subject: Type | string)`**
  - Injects the fetched subject entity.

- **`@AuthData()`**
  - Injects the auth payload.

### Interfaces

- **`SubjectHook<TSubject, TArgs, TAuth>`**
  - Method: `run(params: TArgs, auth?: TAuth): Promise<TSubject | undefined>`.

## Examples

For complete examples, visit the [example directory](https://github.com/moeedchughtai/nest-casl/tree/main/examples) in the repository (update this link after publishing).

## Contributing

Contributions are welcome! Please:
1. Fork the repository.
2. Create a feature branch.
3. Submit a pull request with a clear description.

Report issues or suggest features on the [GitHub Issues page](https://github.com/moeedchughtai/nest-casl/issues).

## License

This package is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

### Notes

- **Context Support**: The package handles HTTP, GraphQL, WebSocket, and RPC contexts out of the box. Extend `getAuthFromContext` and `getAttachTarget` in `AbilityFactory` for custom behavior.
- **CASL Integration**: Familiarity with CASL's `can`, `cannot`, and conditions (e.g., `{ authorId: user.id }`) is recommended. See [CASL docs](https://casl.js.org/).

This README should provide a solid foundation for users to adopt `@moeed/nest-casl` in their NestJS projects. Update repository links and version details before publishing to npm!
