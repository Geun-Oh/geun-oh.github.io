+++
title = '[RDBMS with zig] - Parser'
date = 2025-03-09T02:10:01+09:00
draft = false 
+++

> Zig의 allocator와 comptime에 대한 이해를 더하기 위해, facebook의 RocksDB를 기반으로 하는 RDBMS를 구성한다.
> Lexer 에서 전달한 Token 배열을 기반으로 각 인자들을 추출하는 Parser를 제작한다.
>
> 모든 코드는 https://notes.eatonphil.com/zigrocks-sql.html 레포지토리를 기반으로 하며,
> 추가적인 기능을 구현하는 내용을 포함한다.

# Parser

Parser 는 Lexing 파트에서 각 역할 별로 나눠둔 Segment들을 분석하여 내부의 인자들을 해당 Token의 역할에 맞는 AST로 변환하는 과정을 포함한다.

생성된 AST들은 추후 Executor에게 전달되어 실질적인 구현체(RocksDB)에 전달되어 그에 맞는 Operation을 수행한다.

**Ready for**

`expectTokenKind()` 라는 함수를 정의하여 특정 index의 Token이 원하는 Token Kind와 일치하는지 확인한다.
```zig
    fn expectTokenKind(tokens: []Token, index: usize, kind: Token.Kind) bool {
        if (index >= tokens.len) {
            return false;
        }

        return tokens[index].kind == kind;
    }
```

## AST

먼저, SQL Parser에서 AST는 각 Token을 분석해서 구문 구조를 파악하고, 관련 인자들을 표현해낸 것을 의미한다.
AST에서는 SQL의 문장 구성 요소인 테이블, 컬럼, 필터, WHERE 문에 있는 identifier 등을 분석하여 표현한다.

### Default AST

AST는 이진트리를 기반으로 하기 때문에, 각 Operation Node들은 left, right leaf node를 가진다.
여기서는 각 Operation Node를 ExpressionAST로 정의하고,
각 ExpressionAST는 `liternal` 혹은 `binary_operation`으로 구분된다.

```zig
    pub const BinaryOperationAST = struct {
        operator: Token,
        left: *ExpressionAST,
        right: *ExpressionAST,

        fn print(self: BinaryOperationAST) void {
            self.left.print();
            std.debug.print(" {s} ", .{self.operator.string()});
            self.right.print();
        }
    };

    pub const ExpressionAST = union(enum) {
        literal: Token,
        binary_operation: BinaryOperationAST,

        fn print(self: ExpressionAST) void {
            switch (self) {
                .literal => |literal| switch (literal.kind) {
                    .string => std.debug.print("'{s}'", .{literal.string()}),
                    else => std.debug.print("{s}", .{literal.string()}),
                },
                .binary_operation => self.binary_operation.print(),
            }
        }
    };
```

예를 들어 표현 `a + b` 를 분석한다면 다음과 같이 AST가 형성된다고 생각할 수 있다.

- Root Node: ExpressionAST (type: binary_operation)
  - Binary Operation:
    - Operator: `+`
    - Left: ExpressionAST (type: literal, value: a)
    - Right: ExpressionAST (type: literal, value: b)

이와 같이 SQL문장을 해석하고, 각 상황에 맞는 연산을 수행하도록 한다.

### ParseExpression

이제 Token을 분석해서 각 case에 맞는 expression들을 parsing하는 함수를 작성한다.
추후 작성할 `parse()`함수 내에서 Keyword 기반으로 분류를 먼저 진행하고, 이후 각 Keyword에 대한 인자들을 `parseExpression()`함수에 넣어 값을 추출한 뒤 다시금 본래 AST에 넣어준다.

```zig
    fn parseExpression(self: Parser, tokens: []Token, index: usize) Result(struct {
        ast: ExpressionAST,
        nextPosition: usize,
    }) {
        var i = index;

        var e: ExpressionAST = undefined;

        if (expectTokenKind(tokens, i, Token.Kind.integer) or
            expectTokenKind(tokens, i, Token.Kind.identifier) or
            expectTokenKind(tokens, i, Token.Kind.string))
        {
            e = ExpressionAST{ .literal = tokens[i] };
            i = i + 1;
        } else {
            return .{ .err = "No Expression" };
        }

        if (expectTokenKind(tokens, i, Token.Kind.equal_operator) or
            expectTokenKind(tokens, i, Token.Kind.lt_operator) or
            expectTokenKind(tokens, i, Token.Kind.plus_operator) or
            expectTokenKind(tokens, i, Token.Kind.concat_operator))
        {
            const newE = ExpressionAST{
                .binary_operation = BinaryOperationAST{
                    .operator = tokens[i],
                    .left = self.allocator.create(ExpressionAST) catch return .{
                        .err = "Could not allocate for left expression.",
                    },
                    .right = self.allocator.create(ExpressionAST) catch return .{
                        .err = "Could not allocate for right expression",
                    },
                },
            };

            newE.binary_operation.left.* = e;
            e = newE;

            switch (self.parseExpression(tokens, i + 1)) {
                .err => |err| return .{ .err = err },
                .val => |val| {
                    e.binary_operation.right.* = val.ast;
                    i = val.nextPosition;
                },
            }
        }

        return .{ .val = .{ .ast = e, .nextPosition = i } };
    }
```

전반적인 과정을 예시로 표현하면 다음과 같다.

> SQL: `SELECT name, age FROM hello;`
> After Lexing: `[ "SELECT name, age", "FROM hello" ]`
> After Parsing: `AST{ .select = SelectAST{ .columns = ["name", "age"], .from = "hello", .where = null } }`
> *온전히 표현한 것이 아님. 각 인자들의 값들은 실제로는 ExpressionAST임에 주의.
> 
> 그리고 이대로 Executor에게 전달된다.

그러면 이제 각 Keyword에 맞는 AST 구조체를 작성하자.

### SelectAST

```zig
    pub const SelectAST = struct {
        columns: []ExpressionAST,
        from: Token,
        where: ?ExpressionAST,

        fn print(self: SelectAST) void {
            std.debug.print("SELECT\n", .{});
            for (self.columns, 0..) |column, i| {
                std.debug.print("    ", .{});
                column.print();
                if (i < self.columns.len - 1) {
                    std.debug.print(",", .{});
                }

                std.debug.print("\n", .{});
            }

            std.debug.print("FROM\n {s}", .{self.from.string()});

            if (self.where) |where| {
                std.debug.print("\nWHERE\n", .{});
                where.print();
            }

            std.debug.print("\n", .{});
        }
    };

    fn parseSelect(self: Parser, tokens: []Token) Result(AST) {
        var i: usize = 0;
        if (!expectTokenKind(tokens, i, Token.Kind.select_keyword)) {
            return .{ .err = "Expected SELECT keyword" };
        }

        i += 1;

        var columns = std.ArrayList(ExpressionAST).init(self.allocator);
        var select = SelectAST{
            .columns = undefined,
            .from = undefined,
            .where = null,
        };

        // Parse columns
        while (!expectTokenKind(tokens, i, Token.Kind.from_keyword)) {
            if (columns.items.len > 0) {
                if (!expectTokenKind(tokens, i, Token.Kind.comma_syntax)) {
                    lex.debug(tokens, i, "Expected comma.\n");
                    return .{ .err = "Expected comma." };
                }

                i += 1;
            }

            switch (self.parseExpression(tokens, i)) {
                .err => |err| return .{ .err = err },
                .val => |val| {
                    i = val.nextPosition;

                    columns.append(val.ast) catch return .{
                        .err = "Could not allocate for token.",
                    };
                },
            }
        }

        if (!expectTokenKind(tokens, i, Token.Kind.from_keyword)) {
            lex.debug(tokens, i, "Expected FROM keyword after this.\n");
            return .{ .err = "Expected FROM keyword" };
        }

        i += 1;

        if (!expectTokenKind(tokens, i, Token.Kind.identifier)) {
            lex.debug(tokens, i, "Expected FROM table name after this.\n");
            return .{ .err = "Expected FROM keyword" };
        }

        select.from = tokens[i];
        i += 1;

        if (expectTokenKind(tokens, i, Token.Kind.where_keyword)) {
            switch (self.parseExpression(tokens, i + 1)) {
                .err => |err| return .{ .err = err },
                .val => |val| {
                    select.where = val.ast;
                    i = val.nextPosition;
                },
            }
        }

        if (i < tokens.len) {
            lex.debug(tokens, i, "Unexpected token.");
            return .{ .err = "Did not complete parsing SELECT" };
        }

        select.columns = columns.items;
        return .{ .val = AST{ .select = select } };
    }
```

### CreateTableAST

Create Table을 진행할 때에는 각 column에 대한 정보가 `,`로 구분된 배열의 형태로 전해진다.
이를 위해 각 Column정보를 담을 `CreateTableColumnAST` 구조체를 먼저 정의해준다.

```zig
const CreateTableColumnAST = struct {
    name: Token,
    kind: Token,
};
```

이후 columns정보를 가지는 `CreateTableAST`를 정의한다.

```zig
    pub const CreateTableAST = struct {
        table: Token,
        columns: []CreateTableColumnAST,

        fn print(self: CreateTableAST) void {
            std.debug.print("CREATE TABLE {s} (\n", .{self.table.string()});
            for (self.columns, 0..) |column, i| {
                std.debug.print(
                    "   {s} {s}",
                    .{ column.name.string(), column.kind.string() },
                );

                if (i < self.columns.len - 1) {
                    std.debug.print(",", .{});
                }

                std.debug.print("\n", .{});
            }

            std.debug.print(")\n", .{});
        }
    };

    fn parseCreateTable(self: Parser, tokens: []Token) Result(AST) {
        var i: usize = 0;
        if (!expectTokenKind(tokens, i, Token.Kind.create_table_keyword)) {
            return .{ .err = "Expected CREATE TABLE keyword" };
        }
        i += 1;

        if (!expectTokenKind(tokens, i, Token.Kind.identifier)) {
            lex.debug(tokens, i, "Expected table name after CREATE TABLE keyword.\n");
            return .{ .err = "Expected CREATE TABLE name" };
        }

        // 2-dimension array that made with CreateTableColumnAST.
        var columns = std.ArrayList(CreateTableColumnAST).init(self.allocator);
        var create_table = CreateTableAST{
            .columns = undefined,
            .table = tokens[i],
        };
        i += 1;

        if (!expectTokenKind(tokens, i, Token.Kind.left_paren_syntax)) {
            lex.debug(tokens, i, "Expected opening paren after CREATE TABLE name.\n");
            return .{ .err = "Expected opening paren" };
        }
        i += 1;

        while (!expectTokenKind(tokens, i, Token.Kind.right_paren_syntax)) {
            if (columns.items.len > 0) {
                if (!expectTokenKind(tokens, i, Token.Kind.comma_syntax)) {
                    lex.debug(tokens, i, "Expected comma.\n");
                    return .{ .err = "Expected comma." };
                }
                i += 1;
            }

            var column = CreateTableColumnAST{
                .name = undefined,
                .kind = undefined,
            };

            if (!expectTokenKind(tokens, i, Token.Kind.identifier)) {
                lex.debug(tokens, i, "Expected column name after comma.\n");
                return .{ .err = "Expected identifier." };
            }

            column.name = tokens[i];
            i += 1;

            if (!expectTokenKind(tokens, i, Token.Kind.identifier)) {
                lex.debug(tokens, i, "Expected column type after column name.\n");
                return .{ .err = "Expected identifier" };
            }

            column.kind = tokens[i];
            i += 1;

            columns.append(column) catch return .{
                .err = "Could not allocate for column.",
            };
        }

        i += 1;

        if (i < tokens.len) {
            lex.debug(tokens, i, "Unexpected token.");
            return .{ .err = "Did not complete parsing CREATE TABLE" };
        }

        create_table.columns = columns.items;
        return .{ .val = AST{ .create_table = create_table } };
    }
```

### InsertAST

```zig
    pub const InsertAST = struct {
        table: Token,
        values: []ExpressionAST,

        fn print(self: InsertAST) void {
            std.debug.print("INSERT INTO {s} VALUES (", .{self.table.string()});
            for (self.values) |_| {
                std.debug.print(", ", .{});
            }

            std.debug.print(")\n", .{});
        }
    };

    fn parseInsert(self: Parser, tokens: []Token) Result(AST) {
        var i: usize = 0;
        if (!expectTokenKind(tokens, i, Token.Kind.insert_keyword)) {
            return .{ .err = "Expected INSERT INTO keyword" };
        }
        i = i + 1;

        if (!expectTokenKind(tokens, i, Token.Kind.identifier)) {
            lex.debug(tokens, i, "Expected table name after INSERT INTO keyword.\n");
            return .{ .err = "Expected INSERT INTO table name" };
        }

        var values = std.ArrayList(ExpressionAST).init(self.allocator);
        var insert = InsertAST{
            .values = undefined,
            .table = tokens[i],
        };
        i = i + 1;

        if (!expectTokenKind(tokens, i, Token.Kind.values_keyword)) {
            lex.debug(tokens, i, "Expected VALUES keyword.\n");
            return .{ .err = "Expected VALUES keyword" };
        }
        i = i + 1;

        if (!expectTokenKind(tokens, i, Token.Kind.left_paren_syntax)) {
            lex.debug(tokens, i, "Expected opening paren after CREATE TABLE name.\n");
            return .{ .err = "Expected opening paren" };
        }
        i = i + 1;

        while (!expectTokenKind(tokens, i, Token.Kind.right_paren_syntax)) {
            // Check comman if i != 0
            if (values.items.len > 0) {
                if (!expectTokenKind(tokens, i, Token.Kind.comma_syntax)) {
                    lex.debug(tokens, i, "Expected comma.\n");
                    return .{ .err = "Expected comma." };
                }
                i = i + 1;
            }

            switch (self.parseExpression(tokens, i)) {
                .err => |err| return .{ .err = err },
                .val => |val| {
                    values.append(val.ast) catch return .{
                        .err = "Could not allocate for expression.",
                    };
                    i = val.nextPosition;
                },
            }
        }

        // Skip past final paren.
        i = i + 1;

        if (i < tokens.len) {
            lex.debug(tokens, i, "Unexpected token.");
            return .{ .err = "Did not complete parsing INSERT INTO" };
        }

        insert.values = values.items;
        return .{ .val = AST{ .insert = insert } };
    }
```

### AST

이제 전체 Keyword로 작업을 분배해줄 수 있도록 공통 AST enum을 제작하고 parse함수를 작성한다.

```zig
    pub const AST = union(enum) {
        select: SelectAST,
        insert: InsertAST,
        create_table: CreateTableAST,

        pub fn print(self: AST) void {
            switch (self) {
                .select => |select| select.print(),
                .insert => |insert| insert.print(),
                .create_table => |create_table| create_table.print(),
            }
        }
    };

    pub fn parse(self: Parser, tokens: []Token) Result(AST) {
        if (expectTokenKind(tokens, 0, Token.Kind.select_keyword)) {
            return switch (self.parseSelect(tokens)) {
                .err => |err| .{ .err = err },
                .val => |val| .{ .val = val },
            };
        }

        if (expectTokenKind(tokens, 0, Token.Kind.create_table_keyword)) {
            return switch (self.parseCreateTable(tokens)) {
                .err => |err| .{ .err = err },
                .val => |val| .{ .val = val },
            };
        }

        if (expectTokenKind(tokens, 0, Token.Kind.insert_keyword)) {
            return switch (self.parseInsert(tokens)) {
                .err => |err| .{ .err = err },
                .val => |val| .{ .val = val },
            };
        }

        return .{ .err = "Unknown statement" };
    }
```

이제 각 Keyword에 맞는 parsing을 수행하고, 그 결과로 올바른 AST를 반환하는 로직을 작성하였다.
